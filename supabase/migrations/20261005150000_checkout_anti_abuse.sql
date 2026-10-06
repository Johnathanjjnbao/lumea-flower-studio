-- Step 15: close direct checkout RPC access and add a bounded, race-safe throttle for the trusted Edge Function.

create table public.checkout_throttle_buckets (
  identifier_hash text primary key,
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  attempt_count integer not null,
  request_count integer not null,
  idempotency_keys uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint checkout_throttle_identifier_hash check (identifier_hash ~ '^[0-9a-f]{64}$'),
  constraint checkout_throttle_window_order check (expires_at > window_started_at),
  constraint checkout_throttle_attempt_count check (attempt_count between 0 and 5),
  constraint checkout_throttle_request_count check (request_count between 0 and 10),
  constraint checkout_throttle_key_count check (cardinality(idempotency_keys) <= 5)
);

create index checkout_throttle_expiry_idx on public.checkout_throttle_buckets (expires_at);
alter table public.checkout_throttle_buckets enable row level security;
revoke all on table public.checkout_throttle_buckets from public, anon, authenticated;

comment on table public.checkout_throttle_buckets is
  'Short-lived checkout abuse-control buckets keyed by an Edge Function HMAC. Raw client IP addresses are never stored.';

create or replace function public.consume_checkout_throttle(
  request_identifier_hash text,
  request_idempotency_key uuid
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  attempt_count integer,
  idempotent_retry boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_time timestamptz := clock_timestamp();
  bucket public.checkout_throttle_buckets%rowtype;
begin
  if request_identifier_hash is null or request_identifier_hash !~ '^[0-9a-f]{64}$'
    or request_idempotency_key is null then
    raise exception 'CHECKOUT_THROTTLE_INVALID_REQUEST';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(request_identifier_hash, 19420427));

  delete from public.checkout_throttle_buckets
  where ctid in (
    select candidate.ctid
    from public.checkout_throttle_buckets candidate
    where candidate.expires_at < current_time
      and candidate.identifier_hash <> request_identifier_hash
    order by candidate.expires_at
    limit 100
  );

  select source.* into bucket
  from public.checkout_throttle_buckets source
  where source.identifier_hash = request_identifier_hash
  for update;

  if not found or bucket.expires_at <= current_time then
    insert into public.checkout_throttle_buckets (
      identifier_hash, window_started_at, expires_at, attempt_count, request_count, idempotency_keys, updated_at
    ) values (
      request_identifier_hash, current_time, current_time + interval '10 minutes', 1, 1, array[request_idempotency_key], current_time
    )
    on conflict (identifier_hash) do update set
      window_started_at = excluded.window_started_at,
      expires_at = excluded.expires_at,
      attempt_count = excluded.attempt_count,
      request_count = excluded.request_count,
      idempotency_keys = excluded.idempotency_keys,
      updated_at = excluded.updated_at;
    return query select true, 0, 1, false;
    return;
  end if;

  if bucket.request_count >= 10 then
    return query select false, greatest(1, ceil(extract(epoch from bucket.expires_at - current_time))::integer), bucket.attempt_count,
      request_idempotency_key = any(bucket.idempotency_keys);
    return;
  end if;

  if request_idempotency_key = any(bucket.idempotency_keys) then
    update public.checkout_throttle_buckets
    set request_count = checkout_throttle_buckets.request_count + 1,
        updated_at = current_time
    where identifier_hash = request_identifier_hash;

    return query select true, 0, bucket.attempt_count, true;
    return;
  end if;

  if bucket.attempt_count >= 5 then
    return query select false, greatest(1, ceil(extract(epoch from bucket.expires_at - current_time))::integer), bucket.attempt_count, false;
    return;
  end if;

  update public.checkout_throttle_buckets
  set attempt_count = checkout_throttle_buckets.attempt_count + 1,
      request_count = checkout_throttle_buckets.request_count + 1,
      idempotency_keys = array_append(checkout_throttle_buckets.idempotency_keys, request_idempotency_key),
      updated_at = current_time
  where identifier_hash = request_identifier_hash;

  return query select true, 0, bucket.attempt_count + 1, false;
end;
$$;

revoke all on function public.consume_checkout_throttle(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_checkout_throttle(text, uuid) to service_role;

revoke all on function public.create_checkout_order(jsonb, uuid, bigint) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb, uuid, bigint) to service_role;

comment on function public.create_checkout_order(jsonb, uuid, bigint) is
  'Trusted final order command. Public browsers must use the Turnstile-protected create-checkout-order Edge Function.';
