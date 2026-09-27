-- Step 10: live Bouquet Builder catalog, compatibility, Admin ownership, and RLS.

create table public.flower_stems (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  visibility public.visibility_status not null default 'DRAFT',
  availability public.availability_status not null default 'AVAILABLE',
  price_per_stem_amount integer not null,
  seasonal_note_required boolean not null default false,
  sort_order integer not null default 0,
  media_asset_id uuid references public.media_assets (id) on delete restrict,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flower_stems_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint flower_stems_price_nonnegative check (price_per_stem_amount >= 0),
  constraint flower_stems_sort_order_nonnegative check (sort_order >= 0),
  constraint flower_stems_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint flower_stems_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

create table public.flower_stem_translations (
  flower_stem_id uuid not null references public.flower_stems (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  description text,
  image_alt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (flower_stem_id, locale),
  constraint flower_stem_translations_name_not_blank check (char_length(btrim(name)) > 0),
  constraint flower_stem_translations_image_alt_not_blank check (char_length(btrim(image_alt)) > 0)
);

create table public.wrapping_options (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  visibility public.visibility_status not null default 'DRAFT',
  price_modifier_amount integer not null default 0,
  sort_order integer not null default 0,
  media_asset_id uuid references public.media_assets (id) on delete restrict,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wrapping_options_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint wrapping_options_price_nonnegative check (price_modifier_amount >= 0),
  constraint wrapping_options_sort_order_nonnegative check (sort_order >= 0),
  constraint wrapping_options_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint wrapping_options_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

create table public.wrapping_option_translations (
  wrapping_option_id uuid not null references public.wrapping_options (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (wrapping_option_id, locale),
  constraint wrapping_option_translations_name_not_blank check (char_length(btrim(name)) > 0)
);

create table public.wrapping_variants (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  visibility public.visibility_status not null default 'DRAFT',
  price_modifier_amount integer not null default 0,
  swatch_value text not null,
  sort_order integer not null default 0,
  media_asset_id uuid references public.media_assets (id) on delete restrict,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wrapping_variants_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint wrapping_variants_price_nonnegative check (price_modifier_amount >= 0),
  constraint wrapping_variants_swatch_format check (swatch_value ~ '^#[0-9A-Fa-f]{6}$'),
  constraint wrapping_variants_sort_order_nonnegative check (sort_order >= 0),
  constraint wrapping_variants_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint wrapping_variants_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

create table public.wrapping_variant_translations (
  wrapping_variant_id uuid not null references public.wrapping_variants (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (wrapping_variant_id, locale),
  constraint wrapping_variant_translations_name_not_blank check (char_length(btrim(name)) > 0)
);

create table public.wrapping_option_variants (
  wrapping_option_id uuid not null references public.wrapping_options (id) on delete cascade,
  wrapping_variant_id uuid not null references public.wrapping_variants (id) on delete restrict,
  active boolean not null default true,
  price_modifier_amount integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (wrapping_option_id, wrapping_variant_id),
  constraint wrapping_option_variants_price_nonnegative check (price_modifier_amount is null or price_modifier_amount >= 0),
  constraint wrapping_option_variants_sort_order_nonnegative check (sort_order >= 0)
);

create index flower_stems_public_order_idx
  on public.flower_stems (sort_order, id)
  where visibility = 'PUBLISHED' and archived_at is null;
create index flower_stem_translations_locale_idx on public.flower_stem_translations (locale, flower_stem_id);
create index flower_stems_media_idx on public.flower_stems (media_asset_id);
create index wrapping_options_public_order_idx
  on public.wrapping_options (sort_order, id)
  where visibility = 'PUBLISHED' and archived_at is null;
create index wrapping_option_translations_locale_idx on public.wrapping_option_translations (locale, wrapping_option_id);
create index wrapping_options_media_idx on public.wrapping_options (media_asset_id);
create index wrapping_variants_public_order_idx
  on public.wrapping_variants (sort_order, id)
  where visibility = 'PUBLISHED' and archived_at is null;
create index wrapping_variant_translations_locale_idx on public.wrapping_variant_translations (locale, wrapping_variant_id);
create index wrapping_variants_media_idx on public.wrapping_variants (media_asset_id);
create index wrapping_option_variants_variant_idx on public.wrapping_option_variants (wrapping_variant_id, wrapping_option_id);

create trigger flower_stems_set_updated_at before update on public.flower_stems
for each row execute function public.set_updated_at();
create trigger flower_stem_translations_set_updated_at before update on public.flower_stem_translations
for each row execute function public.set_updated_at();
create trigger wrapping_options_set_updated_at before update on public.wrapping_options
for each row execute function public.set_updated_at();
create trigger wrapping_option_translations_set_updated_at before update on public.wrapping_option_translations
for each row execute function public.set_updated_at();
create trigger wrapping_variants_set_updated_at before update on public.wrapping_variants
for each row execute function public.set_updated_at();
create trigger wrapping_variant_translations_set_updated_at before update on public.wrapping_variant_translations
for each row execute function public.set_updated_at();
create trigger wrapping_option_variants_set_updated_at before update on public.wrapping_option_variants
for each row execute function public.set_updated_at();

create or replace function public.flower_stem_publication_issues(target_flower_stem_id uuid)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (
      select 1 from public.flower_stem_translations translation
      where translation.flower_stem_id = flower.id and translation.locale = 'vi'
        and char_length(btrim(translation.name)) > 0 and char_length(btrim(translation.image_alt)) > 0
    ) then 'missing_vi_translation' end,
    case when not exists (
      select 1 from public.flower_stem_translations translation
      where translation.flower_stem_id = flower.id and translation.locale = 'ko'
        and char_length(btrim(translation.name)) > 0 and char_length(btrim(translation.image_alt)) > 0
    ) then 'missing_ko_translation' end,
    case when not exists (
      select 1 from public.media_assets media
      where media.id = flower.media_asset_id and media.access = 'PUBLIC'
        and media.status = 'ACTIVE' and media.storage_bucket = 'public-media'
    ) then 'missing_active_public_image' end
  ], null)
  from public.flower_stems flower
  where flower.id = target_flower_stem_id;
$$;

create or replace function public.wrapping_option_publication_issues(target_wrapping_option_id uuid)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (
      select 1 from public.wrapping_option_translations translation
      where translation.wrapping_option_id = option.id and translation.locale = 'vi'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_vi_translation' end,
    case when not exists (
      select 1 from public.wrapping_option_translations translation
      where translation.wrapping_option_id = option.id and translation.locale = 'ko'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_ko_translation' end,
    case when not exists (
      select 1
      from public.wrapping_option_variants compatibility
      join public.wrapping_variants variant on variant.id = compatibility.wrapping_variant_id
      where compatibility.wrapping_option_id = option.id and compatibility.active
        and variant.visibility = 'PUBLISHED' and variant.archived_at is null
    ) then 'missing_public_compatible_variant' end
  ], null)
  from public.wrapping_options option
  where option.id = target_wrapping_option_id;
$$;

create or replace function public.wrapping_variant_publication_issues(target_wrapping_variant_id uuid)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (
      select 1 from public.wrapping_variant_translations translation
      where translation.wrapping_variant_id = variant.id and translation.locale = 'vi'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_vi_translation' end,
    case when not exists (
      select 1 from public.wrapping_variant_translations translation
      where translation.wrapping_variant_id = variant.id and translation.locale = 'ko'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_ko_translation' end
  ], null)
  from public.wrapping_variants variant
  where variant.id = target_wrapping_variant_id;
$$;

revoke all on function public.flower_stem_publication_issues(uuid) from public;
revoke all on function public.wrapping_option_publication_issues(uuid) from public;
revoke all on function public.wrapping_variant_publication_issues(uuid) from public;

create or replace function public.enforce_flower_stem_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare issues text[];
begin
  if tg_op = 'INSERT' and new.visibility = 'PUBLISHED' then
    raise exception 'Create the flower stem as DRAFT before publishing it';
  end if;
  if new.visibility = 'PUBLISHED' then
    issues := public.flower_stem_publication_issues(new.id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Flower stem is not publication-ready: %', array_to_string(issues, ', ');
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.archived_at := null;
  elsif new.visibility = 'ARCHIVED' then
    new.archived_at := coalesce(new.archived_at, now());
  else
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_wrapping_option_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare issues text[];
begin
  if tg_op = 'INSERT' and new.visibility = 'PUBLISHED' then
    raise exception 'Create the wrapping option as DRAFT before publishing it';
  end if;
  if new.visibility = 'PUBLISHED' then
    issues := public.wrapping_option_publication_issues(new.id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Wrapping option is not publication-ready: %', array_to_string(issues, ', ');
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.archived_at := null;
  elsif new.visibility = 'ARCHIVED' then
    new.archived_at := coalesce(new.archived_at, now());
  else
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_wrapping_variant_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare issues text[];
begin
  if tg_op = 'INSERT' and new.visibility = 'PUBLISHED' then
    raise exception 'Create the wrapping variant as DRAFT before publishing it';
  end if;
  if new.visibility = 'PUBLISHED' then
    issues := public.wrapping_variant_publication_issues(new.id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Wrapping variant is not publication-ready: %', array_to_string(issues, ', ');
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.archived_at := null;
  elsif new.visibility = 'ARCHIVED' then
    new.archived_at := coalesce(new.archived_at, now());
  else
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create trigger flower_stems_enforce_lifecycle
before insert or update of visibility, media_asset_id on public.flower_stems
for each row execute function public.enforce_flower_stem_lifecycle();
create trigger wrapping_options_enforce_lifecycle
before insert or update of visibility on public.wrapping_options
for each row execute function public.enforce_wrapping_option_lifecycle();
create trigger wrapping_variants_enforce_lifecycle
before insert or update of visibility on public.wrapping_variants
for each row execute function public.enforce_wrapping_variant_lifecycle();

alter table public.flower_stems enable row level security;
alter table public.flower_stem_translations enable row level security;
alter table public.wrapping_options enable row level security;
alter table public.wrapping_option_translations enable row level security;
alter table public.wrapping_variants enable row level security;
alter table public.wrapping_variant_translations enable row level security;
alter table public.wrapping_option_variants enable row level security;

revoke all on table public.flower_stems from anon, authenticated;
revoke all on table public.flower_stem_translations from anon, authenticated;
revoke all on table public.wrapping_options from anon, authenticated;
revoke all on table public.wrapping_option_translations from anon, authenticated;
revoke all on table public.wrapping_variants from anon, authenticated;
revoke all on table public.wrapping_variant_translations from anon, authenticated;
revoke all on table public.wrapping_option_variants from anon, authenticated;

grant select on table public.flower_stems, public.flower_stem_translations,
  public.wrapping_options, public.wrapping_option_translations,
  public.wrapping_variants, public.wrapping_variant_translations,
  public.wrapping_option_variants to anon, authenticated;
grant insert, update, delete on table public.flower_stems, public.flower_stem_translations,
  public.wrapping_options, public.wrapping_option_translations,
  public.wrapping_variants, public.wrapping_variant_translations,
  public.wrapping_option_variants to authenticated;

create policy flower_stems_public_read on public.flower_stems
for select to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);
create policy flower_stems_admin_all on public.flower_stems
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy flower_stem_translations_public_read on public.flower_stem_translations
for select to anon, authenticated
using (exists (
  select 1 from public.flower_stems flower
  where flower.id = flower_stem_translations.flower_stem_id
    and flower.visibility = 'PUBLISHED' and flower.archived_at is null
));
create policy flower_stem_translations_admin_all on public.flower_stem_translations
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy wrapping_options_public_read on public.wrapping_options
for select to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);
create policy wrapping_options_admin_all on public.wrapping_options
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy wrapping_option_translations_public_read on public.wrapping_option_translations
for select to anon, authenticated
using (exists (
  select 1 from public.wrapping_options option
  where option.id = wrapping_option_translations.wrapping_option_id
    and option.visibility = 'PUBLISHED' and option.archived_at is null
));
create policy wrapping_option_translations_admin_all on public.wrapping_option_translations
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy wrapping_variants_public_read on public.wrapping_variants
for select to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);
create policy wrapping_variants_admin_all on public.wrapping_variants
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy wrapping_variant_translations_public_read on public.wrapping_variant_translations
for select to anon, authenticated
using (exists (
  select 1 from public.wrapping_variants variant
  where variant.id = wrapping_variant_translations.wrapping_variant_id
    and variant.visibility = 'PUBLISHED' and variant.archived_at is null
));
create policy wrapping_variant_translations_admin_all on public.wrapping_variant_translations
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy wrapping_option_variants_public_read on public.wrapping_option_variants
for select to anon, authenticated
using (
  active
  and exists (
    select 1 from public.wrapping_options option
    where option.id = wrapping_option_variants.wrapping_option_id
      and option.visibility = 'PUBLISHED' and option.archived_at is null
  )
  and exists (
    select 1 from public.wrapping_variants variant
    where variant.id = wrapping_option_variants.wrapping_variant_id
      and variant.visibility = 'PUBLISHED' and variant.archived_at is null
  )
);
create policy wrapping_option_variants_admin_all on public.wrapping_option_variants
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

drop policy media_assets_public_product_read on public.media_assets;
create policy media_assets_public_content_read
on public.media_assets
for select
to anon, authenticated
using (
  access = 'PUBLIC' and status = 'ACTIVE' and storage_bucket = 'public-media'
  and (
    exists (
      select 1 from public.product_images image
      join public.products product on product.id = image.product_id
      where image.media_asset_id = media_assets.id and image.active
        and product.visibility = 'PUBLISHED' and product.archived_at is null
    )
    or exists (
      select 1 from public.occasions occasion
      where occasion.media_asset_id = media_assets.id
        and occasion.visibility = 'PUBLISHED' and occasion.archived_at is null
    )
    or exists (
      select 1 from public.flower_stems flower
      where flower.media_asset_id = media_assets.id
        and flower.visibility = 'PUBLISHED' and flower.archived_at is null
    )
    or exists (
      select 1 from public.wrapping_options option
      where option.media_asset_id = media_assets.id
        and option.visibility = 'PUBLISHED' and option.archived_at is null
    )
    or exists (
      select 1 from public.wrapping_variants variant
      where variant.media_asset_id = media_assets.id
        and variant.visibility = 'PUBLISHED' and variant.archived_at is null
    )
  )
);

create or replace function public.enforce_published_product_media_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  issues text[];
begin
  for target_id in
    select distinct image.product_id
    from public.product_images image
    join public.products product on product.id = image.product_id
    where image.media_asset_id = coalesce(new.id, old.id) and product.visibility = 'PUBLISHED'
  loop
    issues := public.product_publication_issues(target_id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Published Product would become invalid: %', array_to_string(issues, ', ');
    end if;
  end loop;
  for target_id in
    select flower.id from public.flower_stems flower
    where flower.media_asset_id = coalesce(new.id, old.id) and flower.visibility = 'PUBLISHED'
  loop
    issues := public.flower_stem_publication_issues(target_id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Published FlowerStem would become invalid: %', array_to_string(issues, ', ');
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.enforce_published_product_media_integrity() from public;
