begin;
set local search_path = public, extensions;
select plan(22);

select ok(not has_function_privilege('anon', 'public.create_checkout_order(jsonb,uuid,bigint)', 'EXECUTE'), 'anon cannot execute internal checkout RPC');
select ok(not has_function_privilege('authenticated', 'public.create_checkout_order(jsonb,uuid,bigint)', 'EXECUTE'), 'authenticated cannot execute internal checkout RPC');
select ok(has_function_privilege('service_role', 'public.create_checkout_order(jsonb,uuid,bigint)', 'EXECUTE'), 'service role can execute internal checkout RPC');
select ok(not has_table_privilege('anon', 'public.checkout_throttle_buckets', 'SELECT'), 'anon cannot read throttle buckets');
select ok(not has_table_privilege('authenticated', 'public.checkout_throttle_buckets', 'INSERT'), 'authenticated cannot write throttle buckets');

set local role service_role;
select is((select allowed from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000001')), true, 'first attempt allowed');
select is((select idempotent_retry from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000001')), true, 'same idempotency key recognized');
select is((select attempt_count from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000001')), 1, 'idempotent retry does not consume unique attempt');
select is((select allowed from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000002')), true, 'second unique attempt allowed');
select is((select allowed from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000003')), true, 'third unique attempt allowed');
select is((select allowed from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000004')), true, 'fourth unique attempt allowed');
select is((select allowed from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000005')), true, 'fifth unique attempt allowed');
select is((select allowed from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000006')), false, 'sixth unique attempt denied');
select cmp_ok((select retry_after_seconds from public.consume_checkout_throttle(repeat('a', 64), '00000000-0000-4000-8000-000000000006')), '>', 0, 'denial returns retry window');

select is((select allowed from public.consume_checkout_throttle(repeat('c', 64), '00000000-0000-4000-8000-000000000011')), true, 'request-count test starts with an allowed attempt');
do $$
begin
  for retry_number in 1..9 loop
    perform * from public.consume_checkout_throttle(repeat('c', 64), '00000000-0000-4000-8000-000000000011');
  end loop;
end;
$$;
select is((select allowed from public.consume_checkout_throttle(repeat('c', 64), '00000000-0000-4000-8000-000000000012')), false, 'eleventh request is denied even with a new idempotency key');

select throws_ok($$select * from public.consume_checkout_throttle('raw-ip', '00000000-0000-4000-8000-000000000001')$$, 'CHECKOUT_THROTTLE_INVALID_REQUEST', 'raw IP cannot be used as bucket identifier');
select throws_ok($$select * from public.consume_checkout_throttle(repeat('b', 64), null)$$, 'CHECKOUT_THROTTLE_INVALID_REQUEST', 'idempotency key is required');

reset role;
select ok(not has_table_privilege('authenticated', 'public.delivery_settings', 'UPDATE'), 'authenticated cannot bypass delivery settings RPC');
select ok(not has_table_privilege('authenticated', 'public.delivery_windows', 'UPDATE'), 'authenticated cannot bypass delivery window RPC');
select ok(not has_table_privilege('authenticated', 'public.payment_settings', 'UPDATE'), 'authenticated cannot bypass payment settings RPC');
select ok(has_function_privilege('authenticated', 'public.admin_save_delivery_settings(timestamptz,boolean,boolean,boolean,time,text,text,text,text,text,text,text,text)', 'EXECUTE'), 'authenticated role can reach Admin delivery RPC, with is_admin enforced inside');

select * from finish();
rollback;
