-- V2.2 Commercial Content regression. The outer transaction always rolls back.
begin;
set local search_path = public, extensions;
select plan(1);

do $$
begin
  if has_table_privilege('anon', 'public.commercial_content_sections', 'INSERT')
    or has_table_privilege('authenticated', 'public.commercial_content_sections', 'UPDATE')
    or has_table_privilege('anon', 'public.commercial_content_translations', 'DELETE') then
    raise exception 'browser roles unexpectedly have direct commercial content mutation privileges';
  end if;

  if not has_table_privilege('anon', 'public.commercial_content_sections', 'SELECT')
    or not has_table_privilege('authenticated', 'public.commercial_content_translations', 'SELECT') then
    raise exception 'browser roles are missing commercial content read privileges';
  end if;

  if has_function_privilege(
      'anon',
      'public.admin_save_commercial_content(text,visibility_status,text,text,text,text,text,text)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.admin_save_commercial_content(text,visibility_status,text,text,text,text,text,text)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.admin_save_product_atomic_v21_internal(jsonb)',
      'EXECUTE'
    ) then
    raise exception 'V2.2 RPC grants are incorrect';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_translations'
      and column_name = 'care_instructions'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_translations'
      and column_name = 'fulfillment_note'
  ) then
    raise exception 'localized Product guidance columns are missing';
  end if;

  if (select count(*) from public.commercial_content_sections) <> 6
    or exists (
      select 1 from public.commercial_content_sections
      where visibility <> 'DRAFT'
    ) then
    raise exception 'canonical commercial sections must seed exactly once as Draft';
  end if;

  begin
    update public.commercial_content_sections
    set code = 'PAYMENT'
    where code = 'DELIVERY';
    raise exception 'commercial content code unexpectedly changed';
  exception when invalid_parameter_value then
    if sqlerrm <> 'COMMERCIAL_CONTENT_CODE_IMMUTABLE' then raise; end if;
  end;
end;
$$;

insert into public.commercial_content_translations (
  commercial_content_section_id, locale, title, summary, body
)
select id, 'vi'::public.locale_code, 'Giao nhận', 'Tóm tắt giao nhận', 'Nội dung do owner xác nhận.'
from public.commercial_content_sections where code = 'DELIVERY'
union all
select id, 'ko'::public.locale_code, '배송', '배송 요약', '소유자가 확인한 내용입니다.'
from public.commercial_content_sections where code = 'DELIVERY'
union all
select id, 'vi'::public.locale_code, 'Đổi trả', 'Tóm tắt nháp', 'Nội dung nháp.'
from public.commercial_content_sections where code = 'RETURNS_REFUNDS';

update public.commercial_content_sections set visibility = 'PUBLISHED' where code = 'DELIVERY';

do $$
begin
  begin
    insert into public.commercial_content_translations (
      commercial_content_section_id, locale, title, summary, body
    ) select id, 'en'::public.locale_code, 'Invalid', 'Invalid', 'Invalid'
      from public.commercial_content_sections where code = 'DELIVERY';
    raise exception 'unsupported locale unexpectedly saved';
  exception when invalid_text_representation then
    null;
  end;
end;
$$;

set local role anon;
do $$
declare
  section_count integer;
  translation_count integer;
begin
  select count(*) into section_count
  from public.commercial_content_sections
  where code in ('DELIVERY', 'RETURNS_REFUNDS');
  select count(*) into translation_count
  from public.commercial_content_translations translation
  join public.commercial_content_sections section
    on section.id = translation.commercial_content_section_id
  where section.code in ('DELIVERY', 'RETURNS_REFUNDS');
  if section_count <> 1 or translation_count <> 2 then
    raise exception 'public RLS exposed Draft content or hid Published content';
  end if;
end;
$$;
reset role;

insert into public.categories (id, stable_code, slug, visibility, sort_order, published_at)
values ('22000000-0000-4000-8000-000000000001', 'v22-guidance', 'v22-guidance', 'PUBLISHED', 9200, now());
insert into public.category_translations (category_id, locale, name)
values
  ('22000000-0000-4000-8000-000000000001', 'vi', 'V2.2 Guidance'),
  ('22000000-0000-4000-8000-000000000001', 'ko', 'V2.2 안내');

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'v22-ci-staff@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'v22-ci-admin@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22000000-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'v22-ci-user@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
insert into public.admin_profiles (id, auth_user_id, role, active, display_name)
values
  ('22000000-0000-4000-8000-000000000004', '22000000-0000-4000-8000-000000000002', 'STAFF', true, 'V2.2 CI Staff'),
  ('22000000-0000-4000-8000-000000000005', '22000000-0000-4000-8000-000000000003', 'ADMIN', true, 'V2.2 CI Admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000002', true);
do $$
begin
  begin
    perform public.admin_save_commercial_content(
      'RETURNS_REFUNDS', 'DRAFT', 'VI', '', '', 'KO', '', ''
    );
    raise exception 'STAFF unexpectedly saved commercial content';
  exception when insufficient_privilege then
    if sqlerrm <> 'ADMIN_COMMERCIAL_CONTENT_FORBIDDEN' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000006', true);
do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.commercial_content_sections
  where code in ('DELIVERY', 'RETURNS_REFUNDS');
  if visible_count <> 1 then
    raise exception 'authenticated non-Admin can read Draft commercial content';
  end if;
  begin
    perform public.admin_save_commercial_content(
      'RETURNS_REFUNDS', 'DRAFT', 'VI', '', '', 'KO', '', ''
    );
    raise exception 'authenticated non-Admin unexpectedly saved commercial content';
  exception when insufficient_privilege then
    if sqlerrm <> 'ADMIN_COMMERCIAL_CONTENT_FORBIDDEN' then raise; end if;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '22000000-0000-4000-8000-000000000003', true);
do $$
declare
  saved_product_id uuid;
  legacy_product_id uuid;
begin
  begin
    perform public.admin_save_commercial_content(
      'RETURNS_REFUNDS', 'PUBLISHED',
      'Đổi trả & hoàn tiền', 'Tóm tắt owner', 'Nội dung owner',
      '', '', ''
    );
    raise exception 'incomplete VI/KO content unexpectedly published';
  exception when invalid_parameter_value then
    if sqlerrm <> 'ADMIN_COMMERCIAL_CONTENT_TRANSLATIONS_REQUIRED' then raise; end if;
  end;
  if (select visibility from public.commercial_content_sections where code = 'RETURNS_REFUNDS') <> 'DRAFT' then
    raise exception 'failed publish changed the section state';
  end if;

  perform public.admin_save_commercial_content(
    'RETURNS_REFUNDS', 'PUBLISHED',
    'Đổi trả & hoàn tiền', 'Tóm tắt owner', 'Nội dung owner',
    '반품 및 환불', '소유자 요약', '소유자 내용'
  );
  if (select visibility from public.commercial_content_sections where code = 'RETURNS_REFUNDS') <> 'PUBLISHED'
    or (
      select count(*) from public.commercial_content_translations translation
      join public.commercial_content_sections section
        on section.id = translation.commercial_content_section_id
      where section.code = 'RETURNS_REFUNDS'
    ) <> 2 then
    raise exception 'ADMIN commercial content publish did not persist atomically';
  end if;

  saved_product_id := public.admin_save_product_atomic(jsonb_build_object(
    'id', null,
    'stable_code', 'v22-guidance-product',
    'slug', 'v22-guidance-product',
    'product_type', 'READY_MADE_BOUQUET',
    'category_id', '22000000-0000-4000-8000-000000000001',
    'availability', 'AVAILABLE',
    'same_day_eligible', false,
    'sort_order', 9210,
    'vi', jsonb_build_object(
      'name', 'V2.2 Product', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', '',
      'care_instructions', 'Giữ hoa ở nơi mát.',
      'freshness_seasonality_note', 'Nội dung mùa vụ.',
      'substitution_note', 'Nội dung thay thế.',
      'fulfillment_note', 'Nội dung giao nhận.'
    ),
    'ko', jsonb_build_object(
      'name', 'V2.2 상품', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', '',
      'care_instructions', '서늘한 곳에 보관하세요.',
      'freshness_seasonality_note', '계절 안내.',
      'substitution_note', '대체 안내.',
      'fulfillment_note', '주문 처리 안내.'
    ),
    'variants', jsonb_build_array(jsonb_build_object(
      'id', null, 'stable_code', 'standard', 'sku', 'LUM-V22-GUIDANCE-STANDARD',
      'price_amount', 500000, 'active', true, 'sort_order', 10,
      'vi_name', 'Tiêu chuẩn', 'ko_name', '스탠다드'
    )),
    'occasion_ids', jsonb_build_array(),
    'tone_ids', jsonb_build_array()
  ));
  if saved_product_id is null
    or (select care_instructions from public.product_translations where product_id = saved_product_id and locale = 'vi') <> 'Giữ hoa ở nơi mát.'
    or (select substitution_note from public.product_translations where product_id = saved_product_id and locale = 'ko') <> '대체 안내.' then
    raise exception 'atomic Product guidance save is incomplete';
  end if;

  legacy_product_id := public.admin_save_product_atomic(jsonb_build_object(
    'id', null,
    'stable_code', 'v22-legacy-payload-product',
    'slug', 'v22-legacy-payload-product',
    'product_type', 'READY_MADE_BOUQUET',
    'category_id', '22000000-0000-4000-8000-000000000001',
    'availability', 'AVAILABLE',
    'same_day_eligible', false,
    'sort_order', 9220,
    'vi', jsonb_build_object(
      'name', 'Legacy Payload', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', ''
    ),
    'ko', jsonb_build_object(
      'name', '레거시 페이로드', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', ''
    ),
    'variants', jsonb_build_array(jsonb_build_object(
      'id', null, 'stable_code', 'standard', 'sku', 'LUM-V22-LEGACY-STANDARD',
      'price_amount', 510000, 'active', true, 'sort_order', 10,
      'vi_name', 'Tiêu chuẩn', 'ko_name', '스탠다드'
    )),
    'occasion_ids', jsonb_build_array(),
    'tone_ids', jsonb_build_array()
  ));
  if legacy_product_id is null or exists (
    select 1 from public.product_translations
    where product_id = legacy_product_id
      and (care_instructions is not null
        or freshness_seasonality_note is not null
        or substitution_note is not null
        or fulfillment_note is not null)
  ) then
    raise exception 'V2.1 Product payload compatibility is broken';
  end if;

  begin
    perform public.admin_save_product_atomic(jsonb_build_object(
      'id', saved_product_id,
      'stable_code', 'v22-guidance-product',
      'slug', 'v22-guidance-product-mutated',
      'product_type', 'READY_MADE_BOUQUET',
      'category_id', '22000000-0000-4000-8000-000000000001',
      'availability', 'AVAILABLE',
      'same_day_eligible', false,
      'sort_order', 9210,
      'vi', jsonb_build_object(
        'name', 'V2.2 Product', 'composition', jsonb_build_array(),
        'care_instructions', repeat('x', 8001)
      ),
      'ko', jsonb_build_object('name', 'V2.2 상품', 'composition', jsonb_build_array()),
      'variants', jsonb_build_array(),
      'occasion_ids', jsonb_build_array(),
      'tone_ids', jsonb_build_array()
    ));
    raise exception 'oversized guidance unexpectedly saved';
  exception when invalid_parameter_value then
    if sqlerrm <> 'ADMIN_PRODUCT_GUIDANCE_INVALID' then raise; end if;
  end;
  if (select slug from public.products where id = saved_product_id) <> 'v22-guidance-product'
    or (select care_instructions from public.product_translations where product_id = saved_product_id and locale = 'vi') <> 'Giữ hoa ở nơi mát.' then
    raise exception 'failed guidance mutation left partial Product data behind';
  end if;
end;
$$;
reset role;

select pass('V2.2 fixed policies, VI/KO publishing, RLS/RPC boundaries, and atomic Product guidance are controlled');
select * from finish();
rollback;
