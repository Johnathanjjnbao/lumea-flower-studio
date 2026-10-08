-- Sanitized local/CI/staging QA fixtures. Production data is managed through
-- Admin and this file is never loaded by `supabase db push`.

begin;

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-4000-8000-000000000000',
  'authenticated', 'authenticated', 'local-ci-admin@example.invalid', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
) on conflict (id) do nothing;

insert into public.admin_profiles (id, auth_user_id, role, active, display_name)
values (
  '10000001-0000-4000-8000-000000000000',
  '10000000-0000-4000-8000-000000000000',
  'ADMIN', true, 'Sanitized QA Admin'
) on conflict (auth_user_id) do update set role = 'ADMIN', active = true, display_name = excluded.display_name;

insert into public.media_assets (
  id, storage_bucket, storage_path, access, mime_type, byte_size, status
) values (
  '10000004-0000-4000-8000-000000000000',
  'public-media', 'qa/commerce-fixture.svg', 'PUBLIC', 'image/svg+xml', 1, 'ACTIVE'
) on conflict (id) do update set
  access = excluded.access,
  mime_type = excluded.mime_type,
  byte_size = excluded.byte_size,
  status = excluded.status;

insert into public.media_asset_translations (media_asset_id, locale, alt_text)
values
  ('10000004-0000-4000-8000-000000000000', 'vi', 'Ảnh kiểm thử thương mại'),
  ('10000004-0000-4000-8000-000000000000', 'ko', '커머스 테스트 이미지')
on conflict (media_asset_id, locale) do update set alt_text = excluded.alt_text;

insert into public.products (
  id, stable_code, slug, product_type, visibility, availability, category_id,
  same_day_eligible, featured, bestseller, sort_order
) values
  (
    '10000002-0000-4000-8000-000000000000',
    'qa-ready-bouquet', 'qa-ready-bouquet', 'READY_MADE_BOUQUET', 'DRAFT', 'AVAILABLE',
    (select id from public.categories where stable_code = 'bouquets'),
    true, true, false, 9000
  ),
  (
    '10000012-0000-4000-8000-000000000000',
    'qa-seasonal-bouquet', 'qa-seasonal-bouquet', 'READY_MADE_BOUQUET', 'DRAFT', 'SEASONAL',
    (select id from public.categories where stable_code = 'bouquets'),
    false, false, false, 9010
  )
on conflict (id) do update set
  slug = excluded.slug,
  product_type = excluded.product_type,
  visibility = 'DRAFT',
  availability = excluded.availability,
  category_id = excluded.category_id,
  same_day_eligible = excluded.same_day_eligible,
  featured = excluded.featured,
  bestseller = excluded.bestseller,
  sort_order = excluded.sort_order;

insert into public.product_translations (product_id, locale, name, short_description, description, composition)
values
  ('10000002-0000-4000-8000-000000000000', 'vi', 'Bó hoa QA sẵn sàng', 'Fixture READY cho staging.', 'Dữ liệu kiểm thử không phải sản phẩm thật.', array['Hoa QA']),
  ('10000002-0000-4000-8000-000000000000', 'ko', 'QA 준비 꽃다발', '스테이징 READY 픽스처.', '실제 판매 상품이 아닌 테스트 데이터입니다.', array['QA 꽃']),
  ('10000012-0000-4000-8000-000000000000', 'vi', 'Bó hoa QA theo mùa', 'Fixture SEASONAL cho staging.', 'Dữ liệu kiểm thử không phải sản phẩm thật.', array['Hoa theo mùa QA']),
  ('10000012-0000-4000-8000-000000000000', 'ko', 'QA 시즌 꽃다발', '스테이징 SEASONAL 픽스처.', '실제 판매 상품이 아닌 테스트 데이터입니다.', array['QA 시즌 꽃'])
on conflict (product_id, locale) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  composition = excluded.composition;

insert into public.product_variants (id, product_id, stable_code, sku, price_amount, active, sort_order)
values
  ('10000003-0000-4000-8000-000000000000', '10000002-0000-4000-8000-000000000000', 'standard', 'QA-READY-STD', 180000, true, 0),
  ('10000006-0000-4000-8000-000000000000', '10000002-0000-4000-8000-000000000000', 'deluxe', 'QA-READY-DLX', 260000, true, 10),
  ('10000013-0000-4000-8000-000000000000', '10000012-0000-4000-8000-000000000000', 'standard', 'QA-SEASONAL-STD', 220000, true, 0)
on conflict (id) do update set
  product_id = excluded.product_id,
  stable_code = excluded.stable_code,
  sku = excluded.sku,
  price_amount = excluded.price_amount,
  active = excluded.active,
  sort_order = excluded.sort_order;

insert into public.product_variant_translations (product_variant_id, locale, name)
values
  ('10000003-0000-4000-8000-000000000000', 'vi', 'Tiêu chuẩn'),
  ('10000003-0000-4000-8000-000000000000', 'ko', '스탠다드'),
  ('10000006-0000-4000-8000-000000000000', 'vi', 'Cao cấp'),
  ('10000006-0000-4000-8000-000000000000', 'ko', '디럭스'),
  ('10000013-0000-4000-8000-000000000000', 'vi', 'Theo mùa'),
  ('10000013-0000-4000-8000-000000000000', 'ko', '시즌')
on conflict (product_variant_id, locale) do update set name = excluded.name;

insert into public.product_images (id, product_id, media_asset_id, role, sort_order, active)
values
  ('10000005-0000-4000-8000-000000000000', '10000002-0000-4000-8000-000000000000', '10000004-0000-4000-8000-000000000000', 'PRIMARY', 0, true),
  ('10000015-0000-4000-8000-000000000000', '10000012-0000-4000-8000-000000000000', '10000004-0000-4000-8000-000000000000', 'PRIMARY', 0, true)
on conflict (id) do update set role = excluded.role, sort_order = excluded.sort_order, active = excluded.active;

insert into public.product_tones (product_id, tone_id, sort_order, active)
select fixture.product_id, tone.id, fixture.sort_order, true
from (values
  ('10000002-0000-4000-8000-000000000000'::uuid, 'pastel'::text, 0),
  ('10000012-0000-4000-8000-000000000000'::uuid, 'warm'::text, 0)
) fixture(product_id, tone_code, sort_order)
join public.tones tone on tone.stable_code = fixture.tone_code
on conflict (product_id, tone_id) do update set sort_order = excluded.sort_order, active = true;

insert into public.product_occasions (product_id, occasion_id, sort_order)
select fixture.product_id, occasion.id, fixture.sort_order
from (values
  ('10000002-0000-4000-8000-000000000000'::uuid, 'birthday'::text, 0),
  ('10000012-0000-4000-8000-000000000000'::uuid, 'love'::text, 0)
) fixture(product_id, occasion_code, sort_order)
join public.occasions occasion on occasion.stable_code = fixture.occasion_code
on conflict (product_id, occasion_id) do update set sort_order = excluded.sort_order;

update public.products
set visibility = 'PUBLISHED'
where id in (
  '10000002-0000-4000-8000-000000000000',
  '10000012-0000-4000-8000-000000000000'
);

insert into public.flower_stems (
  id, stable_code, visibility, availability, price_per_stem_amount,
  seasonal_note_required, sort_order, media_asset_id
) values
  ('10000020-0000-4000-8000-000000000000', 'qa-rose', 'DRAFT', 'AVAILABLE', 25000, false, 9000, '10000004-0000-4000-8000-000000000000'),
  ('10000021-0000-4000-8000-000000000000', 'qa-seasonal-tulip', 'DRAFT', 'SEASONAL', 40000, true, 9010, '10000004-0000-4000-8000-000000000000')
on conflict (id) do update set
  visibility = 'DRAFT',
  availability = excluded.availability,
  price_per_stem_amount = excluded.price_per_stem_amount,
  seasonal_note_required = excluded.seasonal_note_required,
  sort_order = excluded.sort_order,
  media_asset_id = excluded.media_asset_id;

insert into public.flower_stem_translations (flower_stem_id, locale, name, description, image_alt)
values
  ('10000020-0000-4000-8000-000000000000', 'vi', 'Hoa hồng QA', 'Fixture Builder có sẵn.', 'Hoa hồng kiểm thử'),
  ('10000020-0000-4000-8000-000000000000', 'ko', 'QA 장미', 'Builder AVAILABLE 픽스처.', '테스트 장미'),
  ('10000021-0000-4000-8000-000000000000', 'vi', 'Tulip QA theo mùa', 'Fixture Builder theo mùa.', 'Tulip kiểm thử'),
  ('10000021-0000-4000-8000-000000000000', 'ko', 'QA 시즌 튤립', 'Builder SEASONAL 픽스처.', '테스트 튤립')
on conflict (flower_stem_id, locale) do update set
  name = excluded.name,
  description = excluded.description,
  image_alt = excluded.image_alt;

update public.flower_stems
set visibility = 'PUBLISHED'
where id in (
  '10000020-0000-4000-8000-000000000000',
  '10000021-0000-4000-8000-000000000000'
);

insert into public.wrapping_variants (
  id, stable_code, visibility, price_modifier_amount, swatch_value, sort_order
) values (
  '10000022-0000-4000-8000-000000000000', 'qa-cream', 'DRAFT', 10000, '#F4E9D8', 9000
) on conflict (id) do update set
  visibility = 'DRAFT',
  price_modifier_amount = excluded.price_modifier_amount,
  swatch_value = excluded.swatch_value,
  sort_order = excluded.sort_order;

insert into public.wrapping_variant_translations (wrapping_variant_id, locale, name, description)
values
  ('10000022-0000-4000-8000-000000000000', 'vi', 'Kem QA', 'Màu gói kiểm thử.'),
  ('10000022-0000-4000-8000-000000000000', 'ko', 'QA 크림', '테스트 포장 색상.')
on conflict (wrapping_variant_id, locale) do update set name = excluded.name, description = excluded.description;

update public.wrapping_variants
set visibility = 'PUBLISHED'
where id = '10000022-0000-4000-8000-000000000000';

insert into public.wrapping_options (
  id, stable_code, visibility, price_modifier_amount, sort_order
) values (
  '10000023-0000-4000-8000-000000000000', 'qa-classic-wrap', 'DRAFT', 15000, 9000
) on conflict (id) do update set
  visibility = 'DRAFT',
  price_modifier_amount = excluded.price_modifier_amount,
  sort_order = excluded.sort_order;

insert into public.wrapping_option_translations (wrapping_option_id, locale, name, description)
values
  ('10000023-0000-4000-8000-000000000000', 'vi', 'Gói cổ điển QA', 'Kiểu gói kiểm thử.'),
  ('10000023-0000-4000-8000-000000000000', 'ko', 'QA 클래식 포장', '테스트 포장 유형.')
on conflict (wrapping_option_id, locale) do update set name = excluded.name, description = excluded.description;

insert into public.wrapping_option_variants (
  wrapping_option_id, wrapping_variant_id, active, price_modifier_amount, sort_order
) values (
  '10000023-0000-4000-8000-000000000000',
  '10000022-0000-4000-8000-000000000000', true, 5000, 0
) on conflict (wrapping_option_id, wrapping_variant_id) do update set
  active = true,
  price_modifier_amount = excluded.price_modifier_amount,
  sort_order = excluded.sort_order;

update public.wrapping_options
set visibility = 'PUBLISHED'
where id = '10000023-0000-4000-8000-000000000000';

insert into public.delivery_zones (id, stable_code, fee_amount, active, same_day_eligible, sort_order)
values ('10000030-0000-4000-8000-000000000000', 'qa-central', 35000, true, true, 9000)
on conflict (id) do update set
  fee_amount = excluded.fee_amount,
  active = true,
  same_day_eligible = true,
  sort_order = excluded.sort_order;

insert into public.delivery_zone_translations (delivery_zone_id, locale, name, help_text)
values
  ('10000030-0000-4000-8000-000000000000', 'vi', 'Khu vực QA trung tâm', 'Chỉ dùng cho staging.'),
  ('10000030-0000-4000-8000-000000000000', 'ko', 'QA 중앙 배송 구역', '스테이징 전용입니다.')
on conflict (delivery_zone_id, locale) do update set name = excluded.name, help_text = excluded.help_text;

insert into public.delivery_zone_areas (
  id, delivery_zone_id, stable_code, name_vi, name_ko, active, sort_order
) values (
  '10000031-0000-4000-8000-000000000000',
  '10000030-0000-4000-8000-000000000000',
  'qa-district', 'Quận QA', 'QA 구', true, 9000
) on conflict (id) do update set
  delivery_zone_id = excluded.delivery_zone_id,
  name_vi = excluded.name_vi,
  name_ko = excluded.name_ko,
  active = true,
  sort_order = excluded.sort_order;

insert into public.delivery_windows (
  id, stable_code, start_time, end_time, label_vi, label_ko,
  help_vi, help_ko, active, same_day_eligible, sort_order
) values (
  '10000032-0000-4000-8000-000000000000', 'qa-afternoon', '13:00', '17:00',
  '13:00–17:00 QA', '13:00–17:00 QA', 'Khung giờ staging.', '스테이징 시간대.', true, true, 9000
) on conflict (id) do update set
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  label_vi = excluded.label_vi,
  label_ko = excluded.label_ko,
  help_vi = excluded.help_vi,
  help_ko = excluded.help_ko,
  active = true,
  same_day_eligible = true,
  sort_order = excluded.sort_order;

update public.delivery_settings
set
  delivery_enabled = true,
  pickup_enabled = true,
  same_day_enabled = true,
  same_day_cutoff = '15:00',
  pickup_name_vi = 'Điểm nhận hàng QA',
  pickup_name_ko = 'QA 픽업 지점',
  pickup_address_vi = 'Địa chỉ staging, không phải cửa hàng thật',
  pickup_address_ko = '실제 매장이 아닌 스테이징 주소',
  pickup_hours_vi = '09:00–18:00 (QA)',
  pickup_hours_ko = '09:00–18:00 (QA)',
  delivery_help_vi = 'Chỉ dùng cho kiểm thử staging.',
  delivery_help_ko = '스테이징 테스트 전용입니다.'
where singleton;

update public.payment_settings
set
  bank_transfer_enabled = false,
  cash_enabled = true,
  cash_delivery_enabled = true,
  cash_pickup_enabled = true,
  bank_id = null,
  bank_name = null,
  account_number = null,
  account_holder = null,
  vietqr_template = null,
  transfer_reference_template = null,
  payment_deadline_hours = null,
  bank_instructions_vi = null,
  bank_instructions_ko = null,
  cash_instructions_vi = 'Thanh toán tiền mặt khi nhận đơn QA.',
  cash_instructions_ko = 'QA 주문 수령 시 현금 결제.'
where singleton;

commit;
