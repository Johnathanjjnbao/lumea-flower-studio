create type public.locale_code as enum ('vi', 'ko');
create type public.product_type as enum (
  'READY_MADE_BOUQUET',
  'FLORIST_CHOICE',
  'CUSTOM_BOUQUET'
);
create type public.visibility_status as enum ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');
create type public.availability_status as enum ('AVAILABLE', 'UNAVAILABLE', 'SEASONAL');
create type public.admin_role as enum ('ADMIN', 'STAFF');
create type public.media_access as enum ('PUBLIC', 'PRIVATE');
create type public.media_status as enum ('ACTIVE', 'ARCHIVED');
create type public.product_image_role as enum ('PRIMARY', 'GALLERY');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete restrict,
  role public.admin_role not null,
  active boolean not null default true,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_display_name_length
    check (display_name is null or char_length(btrim(display_name)) between 1 and 120)
);

comment on table public.admin_profiles is
  'Application authorization profiles linked to Supabase Auth. Bootstrap assignments require trusted owner tooling.';

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  storage_path text not null,
  access public.media_access not null,
  mime_type text not null,
  byte_size bigint,
  width integer,
  height integer,
  checksum text,
  status public.media_status not null default 'ACTIVE',
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_storage_identity unique (storage_bucket, storage_path),
  constraint media_assets_storage_path_not_blank check (char_length(btrim(storage_path)) > 0),
  constraint media_assets_mime_type_not_blank check (char_length(btrim(mime_type)) > 0),
  constraint media_assets_byte_size_nonnegative check (byte_size is null or byte_size >= 0),
  constraint media_assets_dimensions_positive check (
    (width is null or width > 0) and (height is null or height > 0)
  ),
  constraint media_assets_bucket_matches_access check (
    (access = 'PUBLIC' and storage_bucket = 'public-media')
    or (access = 'PRIVATE' and storage_bucket = 'private-uploads')
  ),
  constraint media_assets_archive_state check (
    (status = 'ARCHIVED' and archived_at is not null)
    or status <> 'ARCHIVED'
  )
);

create table public.media_asset_translations (
  media_asset_id uuid not null references public.media_assets (id) on delete cascade,
  locale public.locale_code not null,
  alt_text text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (media_asset_id, locale),
  constraint media_asset_translations_alt_text_not_blank check (char_length(btrim(alt_text)) > 0)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  slug text not null unique,
  product_type public.product_type not null default 'READY_MADE_BOUQUET',
  visibility public.visibility_status not null default 'DRAFT',
  availability public.availability_status not null default 'AVAILABLE',
  same_day_eligible boolean not null default false,
  featured boolean not null default false,
  bestseller boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_sort_order_nonnegative check (sort_order >= 0),
  constraint products_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint products_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

comment on column public.products.visibility is
  'Public lifecycle. Visibility is intentionally separate from operational availability.';
comment on column public.products.availability is
  'Purchasability state. UNAVAILABLE products may remain publicly visible.';

create table public.product_translations (
  product_id uuid not null references public.products (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  short_description text,
  description text,
  composition text[] not null default '{}',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, locale),
  constraint product_translations_name_not_blank check (char_length(btrim(name)) > 0)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  stable_code text not null,
  price_amount integer not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_identity unique (product_id, stable_code),
  constraint product_variants_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint product_variants_price_nonnegative check (price_amount >= 0),
  constraint product_variants_sort_order_nonnegative check (sort_order >= 0)
);

comment on column public.product_variants.price_amount is
  'Authoritative integer VND price for the variant; products do not duplicate a base price.';

create table public.product_variant_translations (
  product_variant_id uuid not null references public.product_variants (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_variant_id, locale),
  constraint product_variant_translations_name_not_blank check (char_length(btrim(name)) > 0)
);

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  slug text not null unique,
  visibility public.visibility_status not null default 'DRAFT',
  sort_order integer not null default 0,
  media_asset_id uuid references public.media_assets (id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occasions_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint occasions_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint occasions_sort_order_nonnegative check (sort_order >= 0),
  constraint occasions_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint occasions_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

create table public.occasion_translations (
  occasion_id uuid not null references public.occasions (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  description text,
  image_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (occasion_id, locale),
  constraint occasion_translations_name_not_blank check (char_length(btrim(name)) > 0)
);

create table public.tones (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  swatch_value text,
  visibility public.visibility_status not null default 'DRAFT',
  sort_order integer not null default 0,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tones_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tones_swatch_format check (swatch_value is null or swatch_value ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tones_sort_order_nonnegative check (sort_order >= 0),
  constraint tones_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint tones_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

create table public.tone_translations (
  tone_id uuid not null references public.tones (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tone_id, locale),
  constraint tone_translations_name_not_blank check (char_length(btrim(name)) > 0)
);

create table public.product_occasions (
  product_id uuid not null references public.products (id) on delete cascade,
  occasion_id uuid not null references public.occasions (id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, occasion_id),
  constraint product_occasions_sort_order_nonnegative check (sort_order >= 0)
);

create table public.product_tones (
  product_id uuid not null references public.products (id) on delete cascade,
  tone_id uuid not null references public.tones (id) on delete restrict,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, tone_id),
  constraint product_tones_sort_order_nonnegative check (sort_order >= 0)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  role public.product_image_role not null default 'GALLERY',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_identity unique (product_id, media_asset_id),
  constraint product_images_sort_order_nonnegative check (sort_order >= 0)
);

create unique index product_images_one_active_primary
  on public.product_images (product_id)
  where role = 'PRIMARY' and active;

create index products_public_catalog_idx
  on public.products (sort_order, id)
  where visibility = 'PUBLISHED' and archived_at is null;
create index products_slug_lookup_idx on public.products (slug);
create index products_discovery_idx
  on public.products (availability, same_day_eligible, sort_order)
  where visibility = 'PUBLISHED' and archived_at is null;
create index product_translations_locale_idx on public.product_translations (locale, product_id);
create index product_variants_product_order_idx on public.product_variants (product_id, active, sort_order, id);
create index product_variant_translations_locale_idx on public.product_variant_translations (locale, product_variant_id);
create index media_assets_status_idx on public.media_assets (access, status, created_at);
create index media_asset_translations_locale_idx on public.media_asset_translations (locale, media_asset_id);
create index occasions_public_order_idx
  on public.occasions (sort_order, id)
  where visibility = 'PUBLISHED' and archived_at is null;
create index occasion_translations_locale_idx on public.occasion_translations (locale, occasion_id);
create index tones_public_order_idx
  on public.tones (sort_order, id)
  where visibility = 'PUBLISHED' and archived_at is null;
create index tone_translations_locale_idx on public.tone_translations (locale, tone_id);
create index product_occasions_occasion_idx on public.product_occasions (occasion_id, product_id);
create index product_tones_tone_idx on public.product_tones (tone_id, product_id);
create index product_images_product_order_idx on public.product_images (product_id, active, sort_order, id);
create index product_images_media_idx on public.product_images (media_asset_id);

create or replace function public.product_publication_issues(target_product_id uuid)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (
      select 1
      from public.product_translations translation
      where translation.product_id = product.id
        and translation.locale = 'vi'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_vi_translation' end,
    case when product.product_type in ('READY_MADE_BOUQUET', 'FLORIST_CHOICE') and not exists (
      select 1
      from public.product_variants variant
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

create or replace function public.enforce_product_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  issues text[];
begin
  if tg_op = 'INSERT' and new.visibility = 'PUBLISHED' then
    raise exception 'Create the product as DRAFT before publishing it';
  end if;

  if new.visibility = 'PUBLISHED' then
    issues := public.product_publication_issues(new.id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Product is not publication-ready: %', array_to_string(issues, ', ');
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.archived_at := null;
  elsif new.visibility = 'ARCHIVED' then
    new.archived_at := coalesce(new.archived_at, now());
  end if;

  return new;
end;
$$;

create trigger products_enforce_lifecycle
before insert or update of visibility on public.products
for each row execute function public.enforce_product_lifecycle();

create trigger admin_profiles_set_updated_at before update on public.admin_profiles
for each row execute function public.set_updated_at();
create trigger media_assets_set_updated_at before update on public.media_assets
for each row execute function public.set_updated_at();
create trigger media_asset_translations_set_updated_at before update on public.media_asset_translations
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger product_translations_set_updated_at before update on public.product_translations
for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
for each row execute function public.set_updated_at();
create trigger product_variant_translations_set_updated_at before update on public.product_variant_translations
for each row execute function public.set_updated_at();
create trigger occasions_set_updated_at before update on public.occasions
for each row execute function public.set_updated_at();
create trigger occasion_translations_set_updated_at before update on public.occasion_translations
for each row execute function public.set_updated_at();
create trigger tones_set_updated_at before update on public.tones
for each row execute function public.set_updated_at();
create trigger tone_translations_set_updated_at before update on public.tone_translations
for each row execute function public.set_updated_at();
create trigger product_tones_set_updated_at before update on public.product_tones
for each row execute function public.set_updated_at();
create trigger product_images_set_updated_at before update on public.product_images
for each row execute function public.set_updated_at();
