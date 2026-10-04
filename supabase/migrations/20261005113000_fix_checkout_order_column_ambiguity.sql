create or replace function public.create_checkout_order(
  checkout_payload jsonb,
  checkout_idempotency_key uuid,
  reviewed_subtotal bigint
)
returns table (
  order_id uuid,
  order_number text,
  subtotal_amount bigint,
  delivery_fee_amount bigint,
  total_amount bigint,
  order_status public.order_status,
  payment_status public.payment_status,
  payment_method public.payment_method,
  fulfillment_type public.fulfillment_type,
  fulfillment_name text,
  delivery_area_name text,
  delivery_window_label text,
  payment_reference text,
  bank_id text,
  bank_name text,
  account_number text,
  account_holder text,
  vietqr_template text,
  payment_instruction text,
  payment_deadline_at timestamptz,
  placed_at timestamptz,
  was_duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_fingerprint text;
  existing_order public.orders%rowtype;
  existing_payment public.payments%rowtype;
  settings public.delivery_settings%rowtype;
  payment_config public.payment_settings%rowtype;
  selected_zone public.delivery_zones%rowtype;
  selected_area public.delivery_zone_areas%rowtype;
  selected_window public.delivery_windows%rowtype;
  requested_fulfillment public.fulfillment_type;
  requested_payment public.payment_method;
  delivery_payload jsonb;
  review_payload jsonb;
  legacy_payload jsonb;
  requested_date date;
  authoritative_fee bigint;
  authoritative_total bigint;
  localized_zone_name text;
  localized_area_name text;
  localized_window_label text;
  localized_pickup_name text;
  localized_pickup_address text;
  localized_pickup_hours text;
  localized_instruction text;
  generated_reference text;
  generated_deadline timestamptz;
  created record;
  created_payment_id uuid;
begin
  if checkout_idempotency_key is null or reviewed_subtotal is null or reviewed_subtotal < 0 then
    raise exception using errcode = '22023', message = 'CHECKOUT_REQUEST_INVALID';
  end if;
  if checkout_payload is null or jsonb_typeof(checkout_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYLOAD_INVALID';
  end if;
  if not (checkout_payload ?& array['locale', 'buyer', 'recipient', 'delivery', 'card_message', 'payment_method', 'review', 'items'])
    or exists (
      select 1 from jsonb_object_keys(checkout_payload) payload_key
      where payload_key not in ('locale', 'buyer', 'recipient', 'delivery', 'card_message', 'payment_method', 'review', 'items')
    ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYLOAD_FIELDS_INVALID';
  end if;
  if checkout_payload->>'locale' not in ('vi', 'ko') then
    raise exception using errcode = '22023', message = 'CHECKOUT_LOCALE_INVALID';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(checkout_idempotency_key::text, 0));
  original_fingerprint := md5(checkout_payload::text || ':' || reviewed_subtotal::text);

  select source_order.* into existing_order
  from public.orders source_order
  where source_order.idempotency_key_hash = md5(checkout_idempotency_key::text);
  if found then
    if existing_order.request_fingerprint <> original_fingerprint then
      raise exception using errcode = '22023', message = 'CHECKOUT_IDEMPOTENCY_REUSED';
    end if;
    select source_payment.* into existing_payment
    from public.payments source_payment where source_payment.order_id = existing_order.id;
    return query select
      existing_order.id, existing_order.order_number, existing_order.subtotal_amount,
      existing_order.delivery_fee_amount, existing_order.total_amount, existing_order.status,
      existing_payment.status, existing_payment.method, existing_order.fulfillment_type,
      coalesce(existing_order.delivery_zone_name_snapshot, existing_order.pickup_name_snapshot),
      existing_order.delivery_area_name_snapshot, existing_order.delivery_window_label_snapshot,
      existing_payment.payment_reference, existing_payment.bank_id_snapshot,
      existing_payment.bank_name_snapshot, existing_payment.account_number_snapshot,
      existing_payment.account_holder_snapshot, existing_payment.vietqr_template_snapshot,
      existing_payment.instruction_snapshot, existing_payment.payment_deadline_at,
      existing_order.placed_at, true;
    return;
  end if;

  delivery_payload := checkout_payload->'delivery';
  review_payload := checkout_payload->'review';
  if jsonb_typeof(delivery_payload) <> 'object'
    or not (delivery_payload ?& array['fulfillment_type', 'area_id', 'window_id', 'address', 'notes', 'requested_date'])
    or exists (
      select 1 from jsonb_object_keys(delivery_payload) delivery_key
      where delivery_key not in ('fulfillment_type', 'area_id', 'window_id', 'address', 'notes', 'requested_date')
    ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_INVALID';
  end if;
  if delivery_payload->>'fulfillment_type' not in ('DELIVERY', 'PICKUP') then
    raise exception using errcode = '22023', message = 'CHECKOUT_FULFILLMENT_INVALID';
  end if;
  requested_fulfillment := (delivery_payload->>'fulfillment_type')::public.fulfillment_type;
  if checkout_payload->>'payment_method' not in ('BANK_TRANSFER', 'CASH') then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYMENT_METHOD_INVALID';
  end if;
  requested_payment := (checkout_payload->>'payment_method')::public.payment_method;
  if jsonb_typeof(review_payload) <> 'object'
    or not (review_payload ?& array['delivery_fee', 'total'])
    or exists (select 1 from jsonb_object_keys(review_payload) review_key where review_key not in ('delivery_fee', 'total'))
    or jsonb_typeof(review_payload->'delivery_fee') <> 'number'
    or review_payload->>'delivery_fee' !~ '^\d+$'
    or jsonb_typeof(review_payload->'total') <> 'number'
    or review_payload->>'total' !~ '^\d+$' then
    raise exception using errcode = '22023', message = 'CHECKOUT_REVIEW_TOTAL_INVALID';
  end if;
  begin
    requested_date := (delivery_payload->>'requested_date')::date;
  exception when others then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_DATE_INVALID';
  end;

  select source_settings.* into settings from public.delivery_settings source_settings where source_settings.singleton;
  select source_payments.* into payment_config from public.payment_settings source_payments where source_payments.singleton;
  if settings.singleton is null or payment_config.singleton is null then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_CONFIGURATION_UNAVAILABLE';
  end if;
  if requested_payment = 'BANK_TRANSFER' and not payment_config.bank_transfer_enabled
    or requested_payment = 'CASH' and (
      not payment_config.cash_enabled
      or requested_fulfillment = 'DELIVERY' and not payment_config.cash_delivery_enabled
      or requested_fulfillment = 'PICKUP' and not payment_config.cash_pickup_enabled
    ) then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_PAYMENT_METHOD_UNAVAILABLE';
  end if;

  if requested_fulfillment = 'DELIVERY' then
    if not settings.delivery_enabled
      or jsonb_typeof(delivery_payload->'area_id') <> 'string'
      or delivery_payload->>'area_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(delivery_payload->'window_id') <> 'string'
      or delivery_payload->>'window_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_UNAVAILABLE';
    end if;

    select zone.* into selected_zone
    from public.delivery_zones zone
    where zone.id = (
      select area.delivery_zone_id from public.delivery_zone_areas area
      where area.id = (delivery_payload->>'area_id')::uuid and area.active
    ) and zone.active
      and exists (
        select 1 from public.delivery_zone_translations translation
        where translation.delivery_zone_id = zone.id
          and translation.locale = (checkout_payload->>'locale')::public.locale_code
      );
    if selected_zone.id is null then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_AREA_UNAVAILABLE';
    end if;
    select area.* into selected_area from public.delivery_zone_areas area
    where area.id = (delivery_payload->>'area_id')::uuid
      and area.delivery_zone_id = selected_zone.id and area.active;
    select delivery_window.* into selected_window from public.delivery_windows delivery_window
    where delivery_window.id = (delivery_payload->>'window_id')::uuid and delivery_window.active;
    if selected_window.id is null then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_WINDOW_UNAVAILABLE';
    end if;

    if requested_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date and (
      not settings.same_day_enabled
      or not selected_zone.same_day_eligible
      or not selected_window.same_day_eligible
      or settings.same_day_cutoff is null
      or (now() at time zone 'Asia/Ho_Chi_Minh')::time >= settings.same_day_cutoff
    ) then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_SAME_DAY_UNAVAILABLE';
    end if;

    authoritative_fee := selected_zone.fee_amount;
    select translation.name into localized_zone_name
    from public.delivery_zone_translations translation
    where translation.delivery_zone_id = selected_zone.id
      and translation.locale = (checkout_payload->>'locale')::public.locale_code;
    localized_area_name := case when checkout_payload->>'locale' = 'ko' then selected_area.name_ko else selected_area.name_vi end;
    localized_window_label := case when checkout_payload->>'locale' = 'ko' then selected_window.label_ko else selected_window.label_vi end;
    if jsonb_typeof(delivery_payload->'address') <> 'string'
      or char_length(btrim(delivery_payload->>'address')) not between 5 and 500 then
      raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_INVALID';
    end if;
  else
    if not settings.pickup_enabled
      or delivery_payload->'area_id' <> 'null'::jsonb
      or delivery_payload->'window_id' <> 'null'::jsonb then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_PICKUP_UNAVAILABLE';
    end if;
    authoritative_fee := 0;
    localized_pickup_name := case when checkout_payload->>'locale' = 'ko' then settings.pickup_name_ko else settings.pickup_name_vi end;
    localized_pickup_address := case when checkout_payload->>'locale' = 'ko' then settings.pickup_address_ko else settings.pickup_address_vi end;
    localized_pickup_hours := case when checkout_payload->>'locale' = 'ko' then settings.pickup_hours_ko else settings.pickup_hours_vi end;
  end if;

  if (review_payload->>'delivery_fee')::bigint <> authoritative_fee
    or (review_payload->>'total')::bigint <> reviewed_subtotal + authoritative_fee then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_REVIEW_CHANGED';
  end if;

  legacy_payload := jsonb_set(checkout_payload - 'review', '{delivery}', jsonb_build_object(
    'address', case when requested_fulfillment = 'DELIVERY' then delivery_payload->>'address' else localized_pickup_address end,
    'notes', delivery_payload->'notes',
    'requested_date', delivery_payload->>'requested_date'
  ));

  select * into created
  from public.create_checkout_order_v12_internal(legacy_payload, checkout_idempotency_key, reviewed_subtotal);
  authoritative_total := created.subtotal_amount + authoritative_fee;
  if requested_payment = 'BANK_TRANSFER' and authoritative_total > 9999999999999 then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYMENT_AMOUNT_UNSUPPORTED';
  end if;

  update public.orders
  set fulfillment_type = requested_fulfillment,
      requested_fulfillment_date = requested_date,
      delivery_fee_amount = authoritative_fee,
      total_amount = authoritative_total,
      delivery_zone_id = case when requested_fulfillment = 'DELIVERY' then selected_zone.id else null end,
      delivery_zone_code_snapshot = case when requested_fulfillment = 'DELIVERY' then selected_zone.stable_code else null end,
      delivery_zone_name_snapshot = localized_zone_name,
      delivery_area_id = case when requested_fulfillment = 'DELIVERY' then selected_area.id else null end,
      delivery_area_code_snapshot = case when requested_fulfillment = 'DELIVERY' then selected_area.stable_code else null end,
      delivery_area_name_snapshot = localized_area_name,
      delivery_window_id = case when requested_fulfillment = 'DELIVERY' then selected_window.id else null end,
      delivery_window_label_snapshot = localized_window_label,
      pickup_name_snapshot = localized_pickup_name,
      pickup_address_snapshot = localized_pickup_address,
      pickup_hours_snapshot = localized_pickup_hours,
      request_fingerprint = original_fingerprint
  where id = created.order_id;

  if requested_fulfillment = 'DELIVERY' then
    update public.order_addresses target_address
    set source_delivery_area_id = selected_area.id,
        zone_name_snapshot = localized_zone_name,
        area_name_snapshot = localized_area_name
    where target_address.order_id = created.order_id;
    update public.deliveries target_delivery
    set requested_window = localized_window_label,
        source_delivery_window_id = selected_window.id,
        window_label_snapshot = localized_window_label
    where target_delivery.order_id = created.order_id
    returning id into created_payment_id;
    insert into public.delivery_status_events (delivery_id, from_status, to_status, reason)
    values (created_payment_id, null, 'PENDING', 'DELIVERY_CREATED');
  else
    delete from public.order_addresses target_address where target_address.order_id = created.order_id;
    delete from public.deliveries target_delivery where target_delivery.order_id = created.order_id;
  end if;

  if requested_payment = 'BANK_TRANSFER' then
    generated_reference := replace(
      payment_config.transfer_reference_template,
      '{order_number}',
      replace(created.order_number, '-', '')
    );
    if generated_reference !~ '^[A-Za-z0-9 ]{1,50}$' then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_PAYMENT_REFERENCE_INVALID';
    end if;
    generated_deadline := case when payment_config.payment_deadline_hours is null then null
      else created.placed_at + make_interval(hours => payment_config.payment_deadline_hours) end;
    localized_instruction := case when checkout_payload->>'locale' = 'ko'
      then payment_config.bank_instructions_ko else payment_config.bank_instructions_vi end;
  else
    localized_instruction := case when checkout_payload->>'locale' = 'ko'
      then payment_config.cash_instructions_ko else payment_config.cash_instructions_vi end;
  end if;

  update public.payments target_payment
  set amount = authoritative_total,
      payment_reference = generated_reference,
      bank_id_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_id else null end,
      bank_name_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_name else null end,
      account_number_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.account_number else null end,
      account_holder_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.account_holder else null end,
      vietqr_template_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.vietqr_template else null end,
      instruction_snapshot = localized_instruction,
      payment_deadline_at = generated_deadline
  where target_payment.order_id = created.order_id
  returning id into created_payment_id;

  insert into public.payment_status_events (payment_id, from_status, to_status, reason)
  values (created_payment_id, null, 'UNPAID', 'PAYMENT_CREATED');

  return query select
    created.order_id, created.order_number, created.subtotal_amount,
    authoritative_fee, authoritative_total, created.order_status,
    created.payment_status, created.payment_method, requested_fulfillment,
    coalesce(localized_zone_name, localized_pickup_name), localized_area_name,
    localized_window_label, generated_reference,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_id else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_name else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.account_number else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.account_holder else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.vietqr_template else null end,
    localized_instruction, generated_deadline, created.placed_at, false;
end;
$$;

comment on function public.create_checkout_order(jsonb, uuid, bigint) is
  'Creates one guest order atomically. Catalog prices, delivery fee, total, payment eligibility, and safe payment snapshots are server-authoritative.';
