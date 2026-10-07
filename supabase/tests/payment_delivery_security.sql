-- STEP 14 controlled database checks. The outer transaction always rolls back.
begin;
select plan(1);

do $$
begin
  if has_table_privilege('anon', 'public.delivery_settings', 'select')
    or has_table_privilege('anon', 'public.delivery_zones', 'select')
    or has_table_privilege('anon', 'public.payment_settings', 'select') then
    raise exception 'anon unexpectedly has direct business-settings access';
  end if;
  if has_function_privilege('anon', 'public.create_checkout_order_v12_internal(jsonb, uuid, bigint)', 'execute') then
    raise exception 'anon unexpectedly has legacy checkout execute';
  end if;
  if not has_function_privilege('anon', 'public.get_checkout_options(public.locale_code)', 'execute') then
    raise exception 'anon is missing the public checkout-options boundary';
  end if;
  if has_function_privilege('anon', 'public.create_checkout_order(jsonb, uuid, bigint)', 'execute')
    or has_function_privilege('authenticated', 'public.create_checkout_order(jsonb, uuid, bigint)', 'execute')
    or not has_function_privilege('service_role', 'public.create_checkout_order(jsonb, uuid, bigint)', 'execute') then
    raise exception 'internal checkout RPC grants do not match the Edge Function-only boundary';
  end if;
  if has_function_privilege('anon', 'public.admin_mark_payment_paid(uuid, public.payment_status, text)', 'execute')
    or has_function_privilege('anon', 'public.admin_transition_delivery_status(uuid, public.delivery_status, public.delivery_status, text)', 'execute') then
    raise exception 'anon unexpectedly has Admin lifecycle execute';
  end if;
end;
$$;

do $$
declare
  qa_zone_id uuid := gen_random_uuid();
  qa_area_id uuid := gen_random_uuid();
  qa_window_id uuid := gen_random_uuid();
  qa_key uuid := gen_random_uuid();
  qa_product_id uuid;
  qa_product_code text;
  qa_variant_id uuid;
  qa_variant_code text;
  qa_tone_code text;
  qa_subtotal bigint;
  qa_payload jsonb;
  first_receipt record;
  duplicate_receipt record;
  second_receipt record;
  pickup_receipt record;
  first_fee bigint;
  first_total bigint;
  payment_row public.payments%rowtype;
  delivery_row public.deliveries%rowtype;
  options jsonb;
  qa_admin_auth_id uuid;
  event_count integer;
begin
  update public.delivery_settings set
    delivery_enabled = true,
    pickup_enabled = true,
    same_day_enabled = true,
    same_day_cutoff = '23:59',
    pickup_name_vi = 'QA Studio', pickup_name_ko = 'QA 스튜디오',
    pickup_address_vi = 'QA only', pickup_address_ko = 'QA 전용',
    pickup_hours_vi = '09:00-18:00', pickup_hours_ko = '09:00-18:00'
  where singleton;

  update public.payment_settings set
    bank_transfer_enabled = true,
    cash_enabled = true,
    cash_delivery_enabled = true,
    cash_pickup_enabled = true,
    bank_id = '970436', bank_name = 'QA Bank', account_number = '123456789',
    account_holder = 'LUMEA QA', vietqr_template = 'compact2',
    transfer_reference_template = 'LUMEA {order_number}', payment_deadline_hours = 24,
    bank_instructions_vi = 'QA only', bank_instructions_ko = 'QA 전용',
    cash_instructions_vi = 'QA only', cash_instructions_ko = 'QA 전용'
  where singleton;

  insert into public.delivery_zones (id, stable_code, fee_amount, active, same_day_eligible, sort_order)
  values (qa_zone_id, 'step14-qa-zone', 30000, true, true, 9999);
  insert into public.delivery_zone_translations (delivery_zone_id, locale, name)
  values (qa_zone_id, 'vi', 'Zone QA'), (qa_zone_id, 'ko', 'QA 구역');
  insert into public.delivery_zone_areas (id, delivery_zone_id, stable_code, name_vi, name_ko, active, sort_order)
  values (qa_area_id, qa_zone_id, 'step14-qa-area', 'Khu vực QA', 'QA 지역', true, 0);
  insert into public.delivery_windows (id, stable_code, start_time, end_time, label_vi, label_ko, active, same_day_eligible, sort_order)
  values (qa_window_id, 'step14-qa-window', '09:00', '18:00', 'Khung giờ QA', 'QA 시간', true, true, 9999);

  select product.id, product.stable_code, variant.id, variant.stable_code, variant.price_amount,
    (select tone.stable_code
     from public.product_tones product_tone join public.tones tone on tone.id = product_tone.tone_id
     where product_tone.product_id = product.id and product_tone.active
       and tone.visibility = 'PUBLISHED' and tone.archived_at is null
     order by product_tone.sort_order, product_tone.tone_id limit 1)
  into qa_product_id, qa_product_code, qa_variant_id, qa_variant_code, qa_subtotal, qa_tone_code
  from public.products product
  join public.product_variants variant on variant.product_id = product.id and variant.active
  where product.product_type in ('READY_MADE_BOUQUET', 'FLORIST_CHOICE')
    and product.visibility = 'PUBLISHED' and product.availability = 'AVAILABLE'
    and product.archived_at is null
  order by product.sort_order, product.id, variant.sort_order, variant.id
  limit 1;
  if qa_product_id is null then raise exception 'No live product exists for STEP 14 checkout test'; end if;

  qa_payload := jsonb_build_object(
    'locale', 'vi',
    'buyer', jsonb_build_object('name', 'STEP14 QA', 'phone', '0900000014', 'email', null),
    'recipient', jsonb_build_object('name', 'STEP14 QA', 'phone', '0900000014', 'buyer_is_recipient', true, 'is_surprise', false),
    'delivery', jsonb_build_object(
      'fulfillment_type', 'DELIVERY', 'area_id', qa_area_id, 'window_id', qa_window_id,
      'address', 'QA ONLY - KHONG GIAO - Ho Chi Minh City', 'notes', 'ROLLBACK QA',
      'requested_date', ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::text
    ),
    'review', jsonb_build_object('delivery_fee', 30000, 'total', qa_subtotal + 30000),
    'card_message', null, 'payment_method', 'BANK_TRANSFER',
    'items', jsonb_build_array(jsonb_build_object(
      'type', 'READY_MADE_PRODUCT', 'product_id', qa_product_id, 'product_code', qa_product_code,
      'variant_id', qa_variant_id, 'variant_code', qa_variant_code, 'tone_code', qa_tone_code, 'quantity', 1
    ))
  );

  select * into first_receipt from public.create_checkout_order(qa_payload, qa_key, qa_subtotal);
  if first_receipt.delivery_fee_amount <> 30000 or first_receipt.total_amount <> qa_subtotal + 30000 then
    raise exception 'server did not persist authoritative delivery fee and total';
  end if;
  select * into payment_row from public.payments where order_id = first_receipt.order_id;
  select * into delivery_row from public.deliveries where order_id = first_receipt.order_id;
  if payment_row.amount <> first_receipt.total_amount
    or payment_row.payment_reference is null
    or payment_row.bank_name_snapshot <> 'QA Bank'
    or delivery_row.window_label_snapshot <> 'Khung giờ QA' then
    raise exception 'payment/delivery snapshot is incomplete';
  end if;

  select * into duplicate_receipt from public.create_checkout_order(qa_payload, qa_key, qa_subtotal);
  if not duplicate_receipt.was_duplicate or duplicate_receipt.order_id <> first_receipt.order_id then
    raise exception 'idempotent retry did not return the original snapshot';
  end if;

  begin
    perform * from public.create_checkout_order(
      jsonb_set(jsonb_set(qa_payload, '{review,delivery_fee}', '0'::jsonb), '{review,total}', to_jsonb(qa_subtotal)),
      gen_random_uuid(), qa_subtotal
    );
    raise exception 'fake client delivery fee unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'CHECKOUT_DELIVERY_REVIEW_CHANGED' then raise; end if;
  end;

  begin
    perform * from public.create_checkout_order(
      jsonb_set(qa_payload, '{delivery,area_id}', to_jsonb(gen_random_uuid()::text)),
      gen_random_uuid(), qa_subtotal
    );
    raise exception 'unsupported delivery area unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'CHECKOUT_DELIVERY_AREA_UNAVAILABLE' then raise; end if;
  end;

  first_fee := first_receipt.delivery_fee_amount;
  first_total := first_receipt.total_amount;
  update public.delivery_zones set fee_amount = 40000 where id = qa_zone_id;
  qa_payload := jsonb_set(jsonb_set(qa_payload, '{review,delivery_fee}', '40000'::jsonb), '{review,total}', to_jsonb(qa_subtotal + 40000));
  select * into second_receipt from public.create_checkout_order(qa_payload, gen_random_uuid(), qa_subtotal);
  if second_receipt.delivery_fee_amount <> 40000 then raise exception 'new order did not use current zone fee'; end if;
  if (select delivery_fee_amount from public.orders where id = first_receipt.order_id) <> first_fee
    or (select total_amount from public.orders where id = first_receipt.order_id) <> first_total then
    raise exception 'changing zone fee rewrote historical order totals';
  end if;

  qa_payload := jsonb_set(qa_payload, '{delivery}', jsonb_build_object(
    'fulfillment_type', 'PICKUP', 'area_id', null, 'window_id', null,
    'address', '', 'notes', 'ROLLBACK QA',
    'requested_date', ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 1)::text
  ));
  qa_payload := jsonb_set(jsonb_set(jsonb_set(qa_payload, '{payment_method}', '"CASH"'::jsonb),
    '{review,delivery_fee}', '0'::jsonb), '{review,total}', to_jsonb(qa_subtotal));
  select * into pickup_receipt from public.create_checkout_order(qa_payload, gen_random_uuid(), qa_subtotal);
  if pickup_receipt.fulfillment_type <> 'PICKUP' or pickup_receipt.delivery_fee_amount <> 0
    or exists (select 1 from public.deliveries where order_id = pickup_receipt.order_id)
    or exists (select 1 from public.order_addresses where order_id = pickup_receipt.order_id)
    or (select pickup_address_snapshot from public.orders where id = pickup_receipt.order_id) <> 'QA only' then
    raise exception 'pickup order did not preserve the authoritative pickup snapshot';
  end if;

  options := public.get_checkout_options('vi');
  if options::text like '%123456789%' or options::text like '%QA Bank%' then
    raise exception 'public checkout options leaked bank account data';
  end if;

  select auth_user_id into qa_admin_auth_id from public.admin_profiles
  where active and role = 'ADMIN' order by created_at limit 1;
  if qa_admin_auth_id is null then raise exception 'No active ADMIN profile is available'; end if;
  perform set_config('request.jwt.claim.sub', qa_admin_auth_id::text, true);
  perform * from public.admin_mark_payment_paid(payment_row.id, 'UNPAID', 'STEP14_ROLLBACK_QA');
  if (select status from public.payments where id = payment_row.id) <> 'PAID' then
    raise exception 'Admin payment confirmation did not persist';
  end if;
  select count(*) into event_count from public.payment_status_events where payment_id = payment_row.id;
  if event_count <> 2 then raise exception 'payment history is incomplete'; end if;

  perform * from public.admin_transition_delivery_status(delivery_row.id, 'PENDING', 'SCHEDULED', 'STEP14_ROLLBACK_QA');
  if (select status from public.deliveries where id = delivery_row.id) <> 'SCHEDULED' then
    raise exception 'Admin delivery transition did not persist';
  end if;
  select count(*) into event_count from public.delivery_status_events where delivery_id = delivery_row.id;
  if event_count <> 2 then raise exception 'delivery history is incomplete'; end if;
end;
$$;

select pass('Payment, delivery, money, idempotency, and Admin lifecycle checks are controlled');
select * from finish();
rollback;
