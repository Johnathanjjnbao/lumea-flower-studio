-- STEP 13 controlled database checks. The outer transaction always rolls back.
begin;

do $$
begin
  if has_table_privilege('anon', 'public.orders', 'select') then
    raise exception 'anon unexpectedly has order SELECT';
  end if;
  if has_table_privilege('authenticated', 'public.orders', 'update')
    or has_table_privilege('authenticated', 'public.orders', 'insert')
    or has_table_privilege('authenticated', 'public.orders', 'delete') then
    raise exception 'authenticated unexpectedly has direct order mutation privileges';
  end if;
  if has_column_privilege('authenticated', 'public.orders', 'idempotency_key_hash', 'select')
    or has_column_privilege('authenticated', 'public.orders', 'request_fingerprint', 'select') then
    raise exception 'Admin browser unexpectedly has checkout hash access';
  end if;
  if not has_column_privilege('authenticated', 'public.orders', 'order_number', 'select') then
    raise exception 'authenticated is missing required order read column';
  end if;
  if has_function_privilege(
    'anon',
    'public.admin_transition_order_status(uuid, public.order_status, public.order_status, text)',
    'execute'
  ) then
    raise exception 'anon unexpectedly has status RPC execute';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.admin_transition_order_status(uuid, public.order_status, public.order_status, text)',
    'execute'
  ) then
    raise exception 'authenticated is missing guarded status RPC execute';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
do $$
begin
  begin
    perform * from public.admin_list_orders(page_size := 1);
    raise exception 'non-Admin list call unexpectedly succeeded';
  exception when insufficient_privilege then
    if sqlerrm <> 'ADMIN_ORDERS_FORBIDDEN' then raise; end if;
  end;
end;
$$;
reset role;

do $$
declare
  qa_order_id uuid := gen_random_uuid();
  qa_admin_auth_id uuid;
  event_count integer;
  current_status public.order_status;
begin
  select auth_user_id into qa_admin_auth_id
  from public.admin_profiles
  where active and role = 'ADMIN'
  order by created_at
  limit 1;
  if qa_admin_auth_id is null then
    raise exception 'No active ADMIN profile is available for the controlled test';
  end if;

  insert into public.orders (
    id, order_number, locale, status, fulfillment_type,
    buyer_name, buyer_phone, buyer_email, buyer_is_recipient, is_surprise,
    card_message, currency, subtotal_amount, delivery_fee_amount, total_amount,
    idempotency_key_hash, request_fingerprint
  ) values (
    qa_order_id,
    'LUM-' || upper(substr(md5(gen_random_uuid()::text), 1, 16)),
    'vi', 'PENDING', 'DELIVERY',
    'STEP13 QA', '0000000000', null, true, false,
    null, 'VND', 1, null, null,
    md5(gen_random_uuid()::text), md5(gen_random_uuid()::text)
  );

  perform set_config('request.jwt.claim.sub', qa_admin_auth_id::text, true);
  perform * from public.admin_transition_order_status(qa_order_id, 'PENDING', 'CONFIRMED', 'STEP13_ROLLBACK_QA');

  select status into current_status from public.orders where id = qa_order_id;
  select count(*) into event_count from public.order_status_events where order_id = qa_order_id;
  if current_status <> 'CONFIRMED' or event_count <> 1 then
    raise exception 'valid transition did not atomically create exactly one event';
  end if;

  begin
    perform * from public.admin_transition_order_status(qa_order_id, 'PENDING', 'CANCELLED', null);
    raise exception 'stale transition unexpectedly succeeded';
  exception when serialization_failure then
    if sqlerrm <> 'ORDER_STATUS_CONFLICT' then raise; end if;
  end;

  begin
    perform * from public.admin_transition_order_status(qa_order_id, 'CONFIRMED', 'COMPLETED', null);
    raise exception 'invalid transition unexpectedly succeeded';
  exception when invalid_parameter_value then
    if sqlerrm <> 'ORDER_STATUS_INVALID_TRANSITION' then raise; end if;
  end;

  select status into current_status from public.orders where id = qa_order_id;
  select count(*) into event_count from public.order_status_events where order_id = qa_order_id;
  if current_status <> 'CONFIRMED' or event_count <> 1 then
    raise exception 'rejected transition changed order state or event history';
  end if;
end;
$$;

rollback;
