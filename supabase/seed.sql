-- Local/CI-only fixtures. Production data is managed through Admin and is never
-- loaded with `supabase db push`.

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
  'ADMIN', true, 'Local CI Admin'
) on conflict (auth_user_id) do nothing;

insert into public.media_assets (
  id, storage_bucket, storage_path, access, mime_type, byte_size, status
) values (
  '10000004-0000-4000-8000-000000000000',
  'public-media', 'ci/checkout-fixture.svg', 'PUBLIC', 'image/svg+xml', 1, 'ACTIVE'
) on conflict (storage_bucket, storage_path) do nothing;

insert into public.media_asset_translations (media_asset_id, locale, alt_text)
values
  ('10000004-0000-4000-8000-000000000000', 'vi', 'Ảnh kiểm thử local'),
  ('10000004-0000-4000-8000-000000000000', 'ko', '로컬 테스트 이미지')
on conflict (media_asset_id, locale) do nothing;

insert into public.products (
  id, stable_code, slug, product_type, visibility, availability,
  same_day_eligible, featured, bestseller, sort_order
) values (
  '10000002-0000-4000-8000-000000000000',
  'local-ci-bouquet', 'local-ci-bouquet', 'READY_MADE_BOUQUET', 'DRAFT',
  'AVAILABLE', true, false, false, 9999
) on conflict (stable_code) do nothing;

insert into public.product_translations (product_id, locale, name, short_description)
values
  ('10000002-0000-4000-8000-000000000000', 'vi', 'Bó hoa kiểm thử local', 'Chỉ dùng cho CI.'),
  ('10000002-0000-4000-8000-000000000000', 'ko', '로컬 테스트 꽃다발', 'CI 전용입니다.')
on conflict (product_id, locale) do nothing;

insert into public.product_variants (id, product_id, stable_code, price_amount, active, sort_order)
values (
  '10000003-0000-4000-8000-000000000000',
  '10000002-0000-4000-8000-000000000000', 'standard', 180000, true, 0
) on conflict (product_id, stable_code) do nothing;

insert into public.product_variant_translations (product_variant_id, locale, name)
values
  ('10000003-0000-4000-8000-000000000000', 'vi', 'Tiêu chuẩn'),
  ('10000003-0000-4000-8000-000000000000', 'ko', '스탠다드')
on conflict (product_variant_id, locale) do nothing;

insert into public.product_images (id, product_id, media_asset_id, role, sort_order, active)
values (
  '10000005-0000-4000-8000-000000000000',
  '10000002-0000-4000-8000-000000000000',
  '10000004-0000-4000-8000-000000000000', 'PRIMARY', 0, true
) on conflict (product_id, media_asset_id) do nothing;

insert into public.product_tones (product_id, tone_id, sort_order, active)
select '10000002-0000-4000-8000-000000000000', tone.id, 0, true
from public.tones tone
where tone.stable_code = 'pastel'
on conflict (product_id, tone_id) do nothing;

update public.products
set visibility = 'PUBLISHED'
where id = '10000002-0000-4000-8000-000000000000'
  and visibility = 'DRAFT';
