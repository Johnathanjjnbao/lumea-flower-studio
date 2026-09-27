-- Step 9B: narrow the first Admin slice to ADMIN-only writes, seed the
-- approved discovery taxonomy, and require complete VI/KO names to publish.

create or replace function public.is_catalog_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles profile
    where profile.auth_user_id = auth.uid()
      and profile.active
      and profile.role = 'ADMIN'
  );
$$;

comment on function public.is_catalog_manager() is
  'Step 9B catalog/media mutation permission. ADMIN only until STAFF permissions are owner-approved.';

insert into public.occasions (stable_code, slug, visibility, sort_order, published_at)
values
  ('birthday', 'birthday', 'PUBLISHED', 10, now()),
  ('love', 'love-anniversary', 'PUBLISHED', 20, now()),
  ('congrats', 'congratulations', 'PUBLISHED', 30, now()),
  ('graduation', 'graduation', 'PUBLISHED', 40, now()),
  ('opening', 'opening-ceremony', 'PUBLISHED', 50, now()),
  ('sympathy', 'sympathy', 'PUBLISHED', 60, now())
on conflict (stable_code) do update set
  slug = excluded.slug,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  published_at = coalesce(public.occasions.published_at, excluded.published_at),
  archived_at = null;

insert into public.occasion_translations (occasion_id, locale, name, description)
select occasion.id, translation.locale::public.locale_code, translation.name, translation.description
from (values
  ('birthday', 'vi', 'Sinh nhật', 'Những bó hoa tươi sáng cho một tuổi mới.'),
  ('birthday', 'ko', '생일', '새로운 한 해를 축하하는 밝은 꽃다발.'),
  ('love', 'vi', 'Tình yêu & Kỷ niệm', 'Hoa cho những điều dịu dàng khó nói thành lời.'),
  ('love', 'ko', '사랑 & 기념일', '말로 다 전하기 어려운 마음을 위한 꽃.'),
  ('congrats', 'vi', 'Chúc mừng', 'Một lời chúc được kết bằng hoa.'),
  ('congrats', 'ko', '축하', '꽃으로 전하는 따뜻한 축하.'),
  ('graduation', 'vi', 'Tốt nghiệp', 'Dấu mốc mới, được ghi nhớ bằng hoa.'),
  ('graduation', 'ko', '졸업', '새로운 시작을 기억하게 하는 꽃.'),
  ('opening', 'vi', 'Khai trương', 'Sắc hoa trang nhã cho khởi đầu thuận lợi.'),
  ('opening', 'ko', '개업', '좋은 시작을 위한 우아한 꽃.'),
  ('sympathy', 'vi', 'Chia buồn', 'Một sự hiện diện lặng lẽ và chân thành.'),
  ('sympathy', 'ko', '위로', '조용하고 진심 어린 위로의 마음.')
) as translation(stable_code, locale, name, description)
join public.occasions occasion on occasion.stable_code = translation.stable_code
on conflict (occasion_id, locale) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.tones (stable_code, swatch_value, visibility, sort_order, published_at)
values
  ('pastel', '#D8C8BC', 'PUBLISHED', 10, now()),
  ('pink', '#C9959D', 'PUBLISHED', 20, now()),
  ('white', '#F3EFE7', 'PUBLISHED', 30, now()),
  ('warm', '#C98762', 'PUBLISHED', 40, now()),
  ('florist-choice', '#A8B19A', 'PUBLISHED', 50, now())
on conflict (stable_code) do update set
  swatch_value = excluded.swatch_value,
  visibility = excluded.visibility,
  sort_order = excluded.sort_order,
  published_at = coalesce(public.tones.published_at, excluded.published_at),
  archived_at = null;

insert into public.tone_translations (tone_id, locale, name, description)
select tone.id, translation.locale::public.locale_code, translation.name, translation.description
from (values
  ('pastel', 'vi', 'Pastel', 'Nhẹ nhàng, trong trẻo và nữ tính.'),
  ('pastel', 'ko', '파스텔', '부드럽고 맑은 분위기.'),
  ('pink', 'vi', 'Hồng', 'Lãng mạn với nhiều sắc độ hồng.'),
  ('pink', 'ko', '핑크', '다양한 핑크 톤의 로맨틱한 무드.'),
  ('white', 'vi', 'Trắng & Ivory', 'Thanh lịch, yên tĩnh và tinh khiết.'),
  ('white', 'ko', '화이트 & 아이보리', '우아하고 차분한 분위기.'),
  ('warm', 'vi', 'Tone ấm', 'Cam, kem và hồng ấm giàu cảm xúc.'),
  ('warm', 'ko', '웜 톤', '오렌지, 크림, 따뜻한 핑크의 조화.'),
  ('florist-choice', 'vi', 'Florist lựa chọn', 'Florist cân bằng sắc hoa đẹp nhất trong ngày.'),
  ('florist-choice', 'ko', '플로리스트 초이스', '그날 가장 아름다운 꽃으로 조화롭게 구성합니다.')
) as translation(stable_code, locale, name, description)
join public.tones tone on tone.stable_code = translation.stable_code
on conflict (tone_id, locale) do update set
  name = excluded.name,
  description = excluded.description;

create or replace function public.product_publication_issues(target_product_id uuid)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (
      select 1 from public.product_translations translation
      where translation.product_id = product.id
        and translation.locale = 'vi'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_vi_translation' end,
    case when not exists (
      select 1 from public.product_translations translation
      where translation.product_id = product.id
        and translation.locale = 'ko'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_ko_translation' end,
    case when product.product_type in ('READY_MADE_BOUQUET', 'FLORIST_CHOICE') and not exists (
      select 1 from public.product_variants variant
      where variant.product_id = product.id
        and variant.active
        and variant.price_amount >= 0
    ) then 'missing_active_variant' end,
    case when not exists (
      select 1
      from public.product_images image
      join public.media_assets media on media.id = image.media_asset_id
      where image.product_id = product.id
        and image.role = 'PRIMARY'
        and image.active
        and media.status = 'ACTIVE'
        and media.access = 'PUBLIC'
    ) then 'missing_active_primary_image' end
  ], null)
  from public.products product
  where product.id = target_product_id;
$$;

revoke all on function public.product_publication_issues(uuid) from public;

create or replace function public.set_product_primary_image(target_product_id uuid, target_image_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_catalog_manager() then
    raise exception 'Not authorized to manage catalog media';
  end if;

  if not exists (
    select 1 from public.product_images image
    where image.id = target_image_id
      and image.product_id = target_product_id
      and image.active
  ) then
    raise exception 'Image is not an active member of this product gallery';
  end if;

  update public.product_images
  set role = 'GALLERY'
  where product_id = target_product_id
    and active
    and role = 'PRIMARY';

  update public.product_images
  set role = 'PRIMARY', sort_order = 0
  where id = target_image_id
    and product_id = target_product_id;
end;
$$;

revoke all on function public.set_product_primary_image(uuid, uuid) from public;
grant execute on function public.set_product_primary_image(uuid, uuid) to authenticated;
