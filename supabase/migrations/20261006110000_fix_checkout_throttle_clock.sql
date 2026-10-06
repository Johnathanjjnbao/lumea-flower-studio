-- Fix a PL/pgSQL name collision with the SQL CURRENT_TIME keyword.
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
  request_time timestamptz := clock_timestamp();
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
    where candidate.expires_at < request_time
      and candidate.identifier_hash <> request_identifier_hash
    order by candidate.expires_at
    limit 100
  );

  select source.* into bucket
  from public.checkout_throttle_buckets source
  where source.identifier_hash = request_identifier_hash
  for update;

  if not found or bucket.expires_at <= request_time then
    insert into public.checkout_throttle_buckets (
      identifier_hash, window_started_at, expires_at, attempt_count, request_count, idempotency_keys, updated_at
    ) values (
      request_identifier_hash, request_time, request_time + interval '10 minutes', 1, 1, array[request_idempotency_key], request_time
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
    return query select false, greatest(1, ceil(extract(epoch from bucket.expires_at - request_time))::integer), bucket.attempt_count,
      request_idempotency_key = any(bucket.idempotency_keys);
    return;
  end if;

  if request_idempotency_key = any(bucket.idempotency_keys) then
    update public.checkout_throttle_buckets
    set request_count = checkout_throttle_buckets.request_count + 1,
        updated_at = request_time
    where identifier_hash = request_identifier_hash;

    return query select true, 0, bucket.attempt_count, true;
    return;
  end if;

  if bucket.attempt_count >= 5 then
    return query select false, greatest(1, ceil(extract(epoch from bucket.expires_at - request_time))::integer), bucket.attempt_count, false;
    return;
  end if;

  update public.checkout_throttle_buckets
  set attempt_count = checkout_throttle_buckets.attempt_count + 1,
      request_count = checkout_throttle_buckets.request_count + 1,
      idempotency_keys = array_append(checkout_throttle_buckets.idempotency_keys, request_idempotency_key),
      updated_at = request_time
  where identifier_hash = request_identifier_hash;

  return query select true, 0, bucket.attempt_count + 1, false;
end;
$$;

revoke all on function public.consume_checkout_throttle(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_checkout_throttle(text, uuid) to service_role;
