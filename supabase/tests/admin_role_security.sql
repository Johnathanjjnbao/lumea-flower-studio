-- STEP 16 regression: V1 is ADMIN-only. STAFF must not acquire a partial
-- catalog or Orders capability through a helper function or direct RLS path.
-- The outer transaction always rolls back.
begin;

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '20000000-0000-4000-8000-000000000000',
  'authenticated', 'authenticated', 'local-ci-staff@example.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.admin_profiles (id, auth_user_id, role, active, display_name)
values (
  '20000001-0000-4000-8000-000000000000',
  '20000000-0000-4000-8000-000000000000',
  'STAFF', true, 'Local CI Staff'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000000', true);

do $$
begin
  if public.is_admin() or public.is_catalog_manager() then
    raise exception 'STAFF unexpectedly received an ADMIN or catalog-manager capability';
  end if;

  begin
    insert into public.products (stable_code, slug)
    values ('staff-must-not-write', 'staff-must-not-write');
    raise exception 'STAFF unexpectedly inserted a Product';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform * from public.admin_list_orders(page_size := 1);
    raise exception 'STAFF unexpectedly listed Orders';
  exception when insufficient_privilege then
    if sqlerrm <> 'ADMIN_ORDERS_FORBIDDEN' then raise; end if;
  end;
end;
$$;

rollback;
