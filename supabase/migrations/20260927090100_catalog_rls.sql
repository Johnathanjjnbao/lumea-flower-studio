create or replace function public.current_admin_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.admin_profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.active
  limit 1;
$$;

create or replace function public.is_admin()
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
      and profile.role in ('ADMIN', 'STAFF')
  );
$$;

revoke all on function public.current_admin_profile_id() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_catalog_manager() from public;
grant execute on function public.current_admin_profile_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_catalog_manager() to authenticated;

alter table public.admin_profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_asset_translations enable row level security;
alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_translations enable row level security;
alter table public.occasions enable row level security;
alter table public.occasion_translations enable row level security;
alter table public.tones enable row level security;
alter table public.tone_translations enable row level security;
alter table public.product_occasions enable row level security;
alter table public.product_tones enable row level security;
alter table public.product_images enable row level security;

revoke all on table public.admin_profiles from anon, authenticated;
revoke all on table public.media_assets from anon, authenticated;
revoke all on table public.media_asset_translations from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_translations from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
revoke all on table public.product_variant_translations from anon, authenticated;
revoke all on table public.occasions from anon, authenticated;
revoke all on table public.occasion_translations from anon, authenticated;
revoke all on table public.tones from anon, authenticated;
revoke all on table public.tone_translations from anon, authenticated;
revoke all on table public.product_occasions from anon, authenticated;
revoke all on table public.product_tones from anon, authenticated;
revoke all on table public.product_images from anon, authenticated;

grant select on table public.products to anon, authenticated;
grant select on table public.product_translations to anon, authenticated;
grant select on table public.product_variants to anon, authenticated;
grant select on table public.product_variant_translations to anon, authenticated;
grant select on table public.media_assets to anon, authenticated;
grant select on table public.media_asset_translations to anon, authenticated;
grant select on table public.occasions to anon, authenticated;
grant select on table public.occasion_translations to anon, authenticated;
grant select on table public.tones to anon, authenticated;
grant select on table public.tone_translations to anon, authenticated;
grant select on table public.product_occasions to anon, authenticated;
grant select on table public.product_tones to anon, authenticated;
grant select on table public.product_images to anon, authenticated;

grant insert, update, delete on table public.products to authenticated;
grant insert, update, delete on table public.product_translations to authenticated;
grant insert, update, delete on table public.product_variants to authenticated;
grant insert, update, delete on table public.product_variant_translations to authenticated;
grant insert, update, delete on table public.media_assets to authenticated;
grant insert, update, delete on table public.media_asset_translations to authenticated;
grant insert, update, delete on table public.occasions to authenticated;
grant insert, update, delete on table public.occasion_translations to authenticated;
grant insert, update, delete on table public.tones to authenticated;
grant insert, update, delete on table public.tone_translations to authenticated;
grant insert, update, delete on table public.product_occasions to authenticated;
grant insert, update, delete on table public.product_tones to authenticated;
grant insert, update, delete on table public.product_images to authenticated;
grant select, insert, update, delete on table public.admin_profiles to authenticated;

create policy admin_profiles_self_or_admin_read
on public.admin_profiles
for select
to authenticated
using (auth_user_id = auth.uid() or public.is_admin());

create policy admin_profiles_admin_insert
on public.admin_profiles
for insert
to authenticated
with check (public.is_admin());

create policy admin_profiles_admin_update
on public.admin_profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy admin_profiles_admin_delete
on public.admin_profiles
for delete
to authenticated
using (public.is_admin());

create policy products_public_read
on public.products
for select
to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);

create policy products_catalog_manager_all
on public.products
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy product_translations_public_read
on public.product_translations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products product
    where product.id = product_translations.product_id
      and product.visibility = 'PUBLISHED'
      and product.archived_at is null
  )
);

create policy product_translations_catalog_manager_all
on public.product_translations
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy product_variants_public_read
on public.product_variants
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.products product
    where product.id = product_variants.product_id
      and product.visibility = 'PUBLISHED'
      and product.archived_at is null
  )
);

create policy product_variants_catalog_manager_all
on public.product_variants
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy product_variant_translations_public_read
on public.product_variant_translations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_variants variant
    join public.products product on product.id = variant.product_id
    where variant.id = product_variant_translations.product_variant_id
      and variant.active
      and product.visibility = 'PUBLISHED'
      and product.archived_at is null
  )
);

create policy product_variant_translations_catalog_manager_all
on public.product_variant_translations
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy occasions_public_read
on public.occasions
for select
to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);

create policy occasions_catalog_manager_all
on public.occasions
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy occasion_translations_public_read
on public.occasion_translations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.occasions occasion
    where occasion.id = occasion_translations.occasion_id
      and occasion.visibility = 'PUBLISHED'
      and occasion.archived_at is null
  )
);

create policy occasion_translations_catalog_manager_all
on public.occasion_translations
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy tones_public_read
on public.tones
for select
to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);

create policy tones_catalog_manager_all
on public.tones
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy tone_translations_public_read
on public.tone_translations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tones tone
    where tone.id = tone_translations.tone_id
      and tone.visibility = 'PUBLISHED'
      and tone.archived_at is null
  )
);

create policy tone_translations_catalog_manager_all
on public.tone_translations
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy product_occasions_public_read
on public.product_occasions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products product
    where product.id = product_occasions.product_id
      and product.visibility = 'PUBLISHED'
      and product.archived_at is null
  )
  and exists (
    select 1
    from public.occasions occasion
    where occasion.id = product_occasions.occasion_id
      and occasion.visibility = 'PUBLISHED'
      and occasion.archived_at is null
  )
);

create policy product_occasions_catalog_manager_all
on public.product_occasions
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy product_tones_public_read
on public.product_tones
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.products product
    where product.id = product_tones.product_id
      and product.visibility = 'PUBLISHED'
      and product.archived_at is null
  )
  and exists (
    select 1
    from public.tones tone
    where tone.id = product_tones.tone_id
      and tone.visibility = 'PUBLISHED'
      and tone.archived_at is null
  )
);

create policy product_tones_catalog_manager_all
on public.product_tones
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy product_images_public_read
on public.product_images
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.products product
    where product.id = product_images.product_id
      and product.visibility = 'PUBLISHED'
      and product.archived_at is null
  )
);

create policy product_images_catalog_manager_all
on public.product_images
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());

create policy media_assets_public_product_read
on public.media_assets
for select
to anon, authenticated
using (
  access = 'PUBLIC'
  and status = 'ACTIVE'
  and storage_bucket = 'public-media'
  and (
    exists (
      select 1
      from public.product_images image
      join public.products product on product.id = image.product_id
      where image.media_asset_id = media_assets.id
        and image.active
        and product.visibility = 'PUBLISHED'
        and product.archived_at is null
    )
    or exists (
      select 1
      from public.occasions occasion
      where occasion.media_asset_id = media_assets.id
        and occasion.visibility = 'PUBLISHED'
        and occasion.archived_at is null
    )
  )
);

create policy media_assets_catalog_manager_all
on public.media_assets
for all
to authenticated
using (public.is_catalog_manager())
with check (
  public.is_catalog_manager()
  and (
    uploaded_by is null
    or uploaded_by = public.current_admin_profile_id()
  )
);

create policy media_asset_translations_public_read
on public.media_asset_translations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.media_assets media
    where media.id = media_asset_translations.media_asset_id
      and media.access = 'PUBLIC'
      and media.status = 'ACTIVE'
  )
);

create policy media_asset_translations_catalog_manager_all
on public.media_asset_translations
for all
to authenticated
using (public.is_catalog_manager())
with check (public.is_catalog_manager());
