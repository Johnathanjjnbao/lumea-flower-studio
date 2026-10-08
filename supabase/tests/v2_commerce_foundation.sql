-- V2.1 Commerce Foundation regression. The outer transaction always rolls back.
begin;
select plan(1);

do $$
declare
  matching_constraint_count integer;
begin
  if has_table_privilege('anon', 'public.categories', 'INSERT')
    or has_table_privilege('authenticated', 'public.categories', 'UPDATE')
    or has_table_privilege('anon', 'public.navigation_items', 'DELETE') then
    raise exception 'public roles unexpectedly have direct V2 commerce mutation privileges';
  end if;

  if not has_table_privilege('anon', 'public.categories', 'SELECT')
    or not has_table_privilege('authenticated', 'public.navigation_items', 'SELECT') then
    raise exception 'public roles are missing required storefront V2 read privileges';
  end if;

  if has_function_privilege('anon', 'public.create_checkout_order(jsonb,uuid,bigint)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.create_checkout_order(jsonb,uuid,bigint)', 'EXECUTE')
    or has_function_privilege('anon', 'public.create_checkout_order_v15_internal(jsonb,uuid,bigint)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.create_checkout_order_v15_internal(jsonb,uuid,bigint)', 'EXECUTE') then
    raise exception 'browser roles unexpectedly have direct Checkout RPC access';
  end if;

  if has_function_privilege('anon', 'public.admin_save_product_atomic(jsonb)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.admin_save_product_atomic(jsonb)', 'EXECUTE') then
    raise exception 'atomic Product RPC grants are incorrect';
  end if;

  if not has_function_privilege('service_role', 'public.create_checkout_order(jsonb,uuid,bigint)', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.create_checkout_order_v15_internal(jsonb,uuid,bigint)', 'EXECUTE') then
    raise exception 'service role is missing the gateway Checkout capability';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants'
      and column_name = 'sku' and is_nullable = 'NO'
  ) then
    raise exception 'Product Variant SKU is not required';
  end if;

  select count(*) into matching_constraint_count
  from pg_catalog.pg_constraint constraint_row
  join pg_catalog.pg_class table_row on table_row.oid = constraint_row.conrelid
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
  where namespace_row.nspname = 'public'
    and table_row.relname = 'product_variants'
    and constraint_row.contype = 'u'
    and pg_catalog.pg_get_constraintdef(constraint_row.oid) ilike '%(sku)%';
  if matching_constraint_count <> 1 then
    raise exception 'Product Variant SKU uniqueness is missing or ambiguous';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name = 'category_id' and is_nullable = 'NO'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items'
      and column_name = 'sku_snapshot' and is_nullable = 'YES'
  ) then
    raise exception 'Category ownership or Order SKU snapshot schema is incomplete';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger trigger_row
    join pg_catalog.pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
    where namespace_row.nspname = 'public'
      and table_row.relname = 'order_items'
      and trigger_row.tgname = 'order_items_new_sku_snapshot_required'
      and trigger_row.tgdeferrable
      and trigger_row.tginitdeferred
      and trigger_row.tgenabled <> 'D'
  ) then
    raise exception 'new Order item SKU snapshot trigger is missing or not deferred';
  end if;
end;
$$;

insert into public.categories (id, stable_code, slug, visibility, sort_order, published_at)
values
  ('21000000-0000-4000-8000-000000000001', 'v2-qa-public', 'v2-qa-public', 'PUBLISHED', 9010, now()),
  ('21000000-0000-4000-8000-000000000002', 'v2-qa-hidden', 'v2-qa-hidden', 'HIDDEN', 9020, null);
insert into public.category_translations (category_id, locale, name)
values
  ('21000000-0000-4000-8000-000000000001', 'vi', 'V2 QA public'),
  ('21000000-0000-4000-8000-000000000001', 'ko', 'V2 QA 공개'),
  ('21000000-0000-4000-8000-000000000002', 'vi', 'V2 QA hidden'),
  ('21000000-0000-4000-8000-000000000002', 'ko', 'V2 QA 숨김');
insert into public.navigation_items (
  id, stable_code, destination_type, category_id, active, sort_order
) values
  ('21000000-0000-4000-8000-000000000003', 'v2-qa-visible', 'CATEGORY', '21000000-0000-4000-8000-000000000001', true, 9010),
  ('21000000-0000-4000-8000-000000000004', 'v2-qa-inactive', 'CATALOG', null, false, 9020);
insert into public.navigation_item_translations (navigation_item_id, locale, label)
values
  ('21000000-0000-4000-8000-000000000003', 'vi', 'V2 QA public'),
  ('21000000-0000-4000-8000-000000000003', 'ko', 'V2 QA 공개'),
  ('21000000-0000-4000-8000-000000000004', 'vi', 'V2 QA hidden'),
  ('21000000-0000-4000-8000-000000000004', 'ko', 'V2 QA 숨김');

set local role anon;
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.categories
  where id in ('21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002');
  if visible_count <> 1 then
    raise exception 'anon Category RLS did not expose exactly the published row';
  end if;
  select count(*) into visible_count from public.navigation_items
  where id in ('21000000-0000-4000-8000-000000000003', '21000000-0000-4000-8000-000000000004');
  if visible_count <> 1 then
    raise exception 'anon Navigation RLS did not expose exactly the active row';
  end if;
end;
$$;
reset role;

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'v2-ci-staff@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'v2-ci-admin@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
insert into public.admin_profiles (id, auth_user_id, role, active, display_name)
values
  ('21000000-0000-4000-8000-000000000007', '21000000-0000-4000-8000-000000000005', 'STAFF', true, 'V2 CI Staff'),
  ('21000000-0000-4000-8000-000000000008', '21000000-0000-4000-8000-000000000006', 'ADMIN', true, 'V2 CI Admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-4000-8000-000000000005', true);
do $$
begin
  begin
    perform public.admin_save_category(
      null, 'v2-staff-denied', 'v2-staff-denied', false, 9030,
      'Staff denied', '스태프 거부', null, null
    );
    raise exception 'STAFF unexpectedly saved a Category';
  exception when insufficient_privilege then
    if sqlerrm <> 'ADMIN_CATEGORY_FORBIDDEN' then raise; end if;
  end;
  begin
    perform public.admin_save_product_atomic('{}'::jsonb);
    raise exception 'STAFF unexpectedly saved a Product';
  exception when insufficient_privilege then
    if sqlerrm <> 'ADMIN_PRODUCT_FORBIDDEN' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '21000000-0000-4000-8000-000000000006', true);
do $$
declare
  saved_category_id uuid;
  saved_navigation_id uuid;
  saved_product_id uuid;
  saved_variant_id uuid;
  category_order uuid[];
  navigation_order uuid[];
begin
  saved_category_id := public.admin_save_category(
    null, 'v2-admin-allowed', 'v2-admin-allowed', false, 9040,
    'Admin allowed', '관리자 허용', null, null
  );
  if saved_category_id is null then
    raise exception 'ADMIN Category RPC did not return an id';
  end if;

  saved_product_id := public.admin_save_product_atomic(jsonb_build_object(
    'id', null,
    'stable_code', 'v2-atomic-product',
    'slug', 'v2-atomic-product',
    'product_type', 'READY_MADE_BOUQUET',
    'category_id', saved_category_id,
    'availability', 'AVAILABLE',
    'same_day_eligible', false,
    'sort_order', 9050,
    'vi', jsonb_build_object(
      'name', 'Atomic Product', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', ''
    ),
    'ko', jsonb_build_object(
      'name', 'Atomic Product KO', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', ''
    ),
    'variants', jsonb_build_array(jsonb_build_object(
      'id', null, 'stable_code', 'standard', 'sku', 'LUM-V2-ATOMIC-STANDARD',
      'price_amount', 500000, 'active', true, 'sort_order', 10,
      'vi_name', 'Tiêu chuẩn', 'ko_name', '스탠다드'
    )),
    'occasion_ids', jsonb_build_array(),
    'tone_ids', jsonb_build_array()
  ));
  select id into saved_variant_id
  from public.product_variants
  where product_id = saved_product_id and sku = 'LUM-V2-ATOMIC-STANDARD';
  if saved_product_id is null or saved_variant_id is null then
    raise exception 'atomic Product RPC did not persist Product and Variant together';
  end if;

  begin
    perform public.admin_save_product_atomic(jsonb_build_object(
      'id', saved_product_id,
      'stable_code', 'v2-atomic-product',
      'slug', 'v2-atomic-mutated',
      'product_type', 'READY_MADE_BOUQUET',
      'category_id', saved_category_id,
      'availability', 'AVAILABLE',
      'same_day_eligible', false,
      'sort_order', 9050,
      'vi', jsonb_build_object(
        'name', 'Atomic Product', 'short_description', '', 'description', '',
        'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', ''
      ),
      'ko', jsonb_build_object(
        'name', 'Atomic Product KO', 'short_description', '', 'description', '',
        'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', ''
      ),
      'variants', jsonb_build_array(jsonb_build_object(
        'id', saved_variant_id, 'stable_code', 'standard', 'sku', 'LUM-V2-ATOMIC-CHANGED',
        'price_amount', 500000, 'active', true, 'sort_order', 10,
        'vi_name', 'Tiêu chuẩn', 'ko_name', '스탠다드'
      )),
      'occasion_ids', jsonb_build_array(),
      'tone_ids', jsonb_build_array()
    ));
    raise exception 'immutable SKU unexpectedly changed';
  exception when invalid_parameter_value then
    if sqlerrm <> 'PRODUCT_VARIANT_SKU_IMMUTABLE' then raise; end if;
  end;
  if (select slug from public.products where id = saved_product_id) <> 'v2-atomic-product'
    or (select sku from public.product_variants where id = saved_variant_id) <> 'LUM-V2-ATOMIC-STANDARD' then
    raise exception 'failed atomic Product mutation left partial data behind';
  end if;

  delete from public.product_variants where product_id = saved_product_id;
  delete from public.products where id = saved_product_id;

  saved_navigation_id := public.admin_save_navigation_item(
    null, 'v2-admin-category-link', 'CATEGORY', saved_category_id, null, false, 9040,
    'Admin category link', '관리자 카테고리 링크'
  );
  if saved_navigation_id is null then
    raise exception 'ADMIN Navigation RPC did not return an id';
  end if;

  select array_agg(id order by sort_order, id) into category_order
  from public.categories where visibility <> 'ARCHIVED';
  perform public.admin_reorder_categories(category_order);
  select array_agg(id order by sort_order, id) into navigation_order
  from public.navigation_items;
  perform public.admin_reorder_navigation(navigation_order);

  perform public.admin_delete_navigation_item(saved_navigation_id);
  insert into public.products (id, stable_code, slug, category_id)
  values ('21000000-0000-4000-8000-000000000009', 'v2-category-dependent', 'v2-category-dependent', saved_category_id);
  begin
    perform public.admin_archive_category(saved_category_id);
    raise exception 'Category with a dependent Product was unexpectedly archived';
  exception when foreign_key_violation then
    if sqlerrm <> 'ADMIN_CATEGORY_IN_USE' then raise; end if;
  end;
  delete from public.products where id = '21000000-0000-4000-8000-000000000009';
  perform public.admin_archive_category(saved_category_id);
  if exists (select 1 from public.navigation_items where id = saved_navigation_id)
    or not exists (
      select 1 from public.categories
      where id = saved_category_id and visibility = 'ARCHIVED' and archived_at is not null
    ) then
    raise exception 'ADMIN Navigation delete or Category archive did not persist';
  end if;
end;
$$;
reset role;

select pass('V2.1 SKU, canonical Category, atomic Product, Navigation, ADMIN/STAFF, RLS, and Checkout contracts are controlled');
select * from finish();
rollback;
