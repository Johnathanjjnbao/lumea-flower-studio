-- Step 12 hardening: the V1 storefront always uses the isolated anonymous
-- Supabase client. Signed-in roles do not need this guest-order capability.
revoke execute on function public.create_checkout_order(jsonb, uuid, bigint) from authenticated;
grant execute on function public.create_checkout_order(jsonb, uuid, bigint) to anon;

comment on function public.create_checkout_order(jsonb, uuid, bigint) is
  'Intentional anonymous guest-checkout boundary. Validates an exact payload allowlist, resolves price and availability server-side, serializes idempotent retries, and returns a minimal non-PII receipt.';
