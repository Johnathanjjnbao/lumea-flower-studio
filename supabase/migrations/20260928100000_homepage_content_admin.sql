-- Step 10.6: fixed-slot Homepage content, media, value stories, and Product curation.
-- React continues to own layout, section order, typography, and motion.

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  enabled boolean not null default true,
  display_order integer not null,
  primary_cta_target text,
  secondary_cta_target text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_sections_known_key check (section_key in (
    'hero', 'occasions', 'best_sellers', 'budget', 'same_day',
    'florist_choice', 'create_bouquet', 'why_lumea', 'gallery', 'visit'
  )),
  constraint homepage_sections_display_order_nonnegative check (display_order >= 0),
  constraint homepage_sections_primary_cta_safe check (
    primary_cta_target is null or primary_cta_target in (
      '/flowers', '/create-bouquet', '/flowers?sameDay=true',
      '#florist-choice', '#custom', '#gallery', '#visit'
    )
  ),
  constraint homepage_sections_secondary_cta_safe check (
    secondary_cta_target is null or secondary_cta_target in (
      '/flowers', '/create-bouquet', '/flowers?sameDay=true',
      '#florist-choice', '#custom', '#gallery', '#visit'
    )
  )
);

comment on table public.homepage_sections is
  'Stable fixed-layout Homepage sections. section_key selects a known React contract; this is not a page builder.';

create table public.homepage_section_translations (
  homepage_section_id uuid not null references public.homepage_sections (id) on delete cascade,
  locale public.locale_code not null,
  eyebrow text,
  title_line_one text not null,
  title_line_two text,
  body text,
  note text,
  primary_cta_label text,
  secondary_cta_label text,
  secondary_heading text,
  secondary_body text,
  detail_one_label text,
  detail_one_value text,
  detail_two_label text,
  detail_two_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (homepage_section_id, locale),
  constraint homepage_section_translations_title_not_blank check (char_length(btrim(title_line_one)) > 0)
);

create table public.homepage_section_media (
  id uuid primary key default gen_random_uuid(),
  homepage_section_id uuid not null references public.homepage_sections (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  slot_key text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_section_media_slot_not_blank check (char_length(btrim(slot_key)) > 0),
  constraint homepage_section_media_sort_order_nonnegative check (sort_order >= 0),
  constraint homepage_section_media_slot_unique unique (homepage_section_id, slot_key)
);

create table public.homepage_feature_items (
  id uuid primary key default gen_random_uuid(),
  homepage_section_id uuid not null references public.homepage_sections (id) on delete cascade,
  item_key text not null,
  media_asset_id uuid references public.media_assets (id) on delete restrict,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homepage_feature_items_key_not_blank check (char_length(btrim(item_key)) > 0),
  constraint homepage_feature_items_sort_order_nonnegative check (sort_order >= 0),
  constraint homepage_feature_items_key_unique unique (homepage_section_id, item_key)
);

create table public.homepage_feature_item_translations (
  homepage_feature_item_id uuid not null references public.homepage_feature_items (id) on delete cascade,
  locale public.locale_code not null,
  label text,
  title text not null,
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (homepage_feature_item_id, locale),
  constraint homepage_feature_item_translations_title_not_blank check (char_length(btrim(title)) > 0)
);

create table public.homepage_product_curations (
  homepage_section_id uuid not null references public.homepage_sections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (homepage_section_id, product_id),
  constraint homepage_product_curations_sort_order_nonnegative check (sort_order >= 0),
  constraint homepage_product_curations_order_unique unique (homepage_section_id, sort_order)
);

create index homepage_sections_public_order_idx
  on public.homepage_sections (display_order, id) where enabled;
create index homepage_section_translations_locale_idx
  on public.homepage_section_translations (locale, homepage_section_id);
create index homepage_section_media_public_idx
  on public.homepage_section_media (homepage_section_id, sort_order, id) where active;
create index homepage_feature_items_public_idx
  on public.homepage_feature_items (homepage_section_id, sort_order, id) where active;
create index homepage_feature_item_translations_locale_idx
  on public.homepage_feature_item_translations (locale, homepage_feature_item_id);
create index homepage_product_curations_public_idx
  on public.homepage_product_curations (homepage_section_id, sort_order, product_id) where active;
create index homepage_product_curations_product_idx
  on public.homepage_product_curations (product_id, homepage_section_id) where active;

create trigger homepage_sections_set_updated_at
before update on public.homepage_sections
for each row execute function public.set_updated_at();
create trigger homepage_section_translations_set_updated_at
before update on public.homepage_section_translations
for each row execute function public.set_updated_at();
create trigger homepage_section_media_set_updated_at
before update on public.homepage_section_media
for each row execute function public.set_updated_at();
create trigger homepage_feature_items_set_updated_at
before update on public.homepage_feature_items
for each row execute function public.set_updated_at();
create trigger homepage_feature_item_translations_set_updated_at
before update on public.homepage_feature_item_translations
for each row execute function public.set_updated_at();
create trigger homepage_product_curations_set_updated_at
before update on public.homepage_product_curations
for each row execute function public.set_updated_at();

create or replace function public.enforce_homepage_media_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_section_key text;
  active_count integer;
begin
  if not new.active then return new; end if;

  select section_key into target_section_key
  from public.homepage_sections
  where id = new.homepage_section_id;

  if target_section_key = 'gallery' then
    select count(*) into active_count
    from public.homepage_section_media media
    where media.homepage_section_id = new.homepage_section_id
      and media.active
      and media.id <> new.id;
    if active_count >= 10 then
      raise exception 'Gallery supports at most 10 active images.';
    end if;
  end if;
  return new;
end;
$$;

create trigger homepage_section_media_capacity
before insert or update of active, homepage_section_id on public.homepage_section_media
for each row execute function public.enforce_homepage_media_capacity();

create or replace function public.replace_homepage_product_curations(
  target_section_id uuid,
  target_product_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_count integer := coalesce(cardinality(target_product_ids), 0);
  valid_count integer;
begin
  if not public.is_admin() then
    raise exception 'Homepage curation requires an active ADMIN profile.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.homepage_sections section
    where section.id = target_section_id and section.section_key = 'best_sellers'
  ) then
    raise exception 'Curation target must be the Best Sellers section.';
  end if;
  if requested_count > 6 then
    raise exception 'Best Sellers supports at most 6 Products.';
  end if;
  if requested_count <> coalesce((select count(distinct id) from unnest(target_product_ids) id), 0) then
    raise exception 'Best Sellers Product selection contains duplicates.';
  end if;

  select count(*) into valid_count
  from public.products product
  where product.id = any(coalesce(target_product_ids, array[]::uuid[]))
    and product.visibility = 'PUBLISHED'
    and product.archived_at is null;
  if valid_count <> requested_count then
    raise exception 'Best Sellers can contain only published Products.';
  end if;

  delete from public.homepage_product_curations
  where homepage_section_id = target_section_id;

  insert into public.homepage_product_curations (homepage_section_id, product_id, sort_order, active)
  select target_section_id, product_id, (ordinality - 1)::integer * 10, true
  from unnest(coalesce(target_product_ids, array[]::uuid[])) with ordinality as selected(product_id, ordinality);
end;
$$;

revoke all on function public.enforce_homepage_media_capacity() from public;
revoke all on function public.replace_homepage_product_curations(uuid, uuid[]) from public;
grant execute on function public.replace_homepage_product_curations(uuid, uuid[]) to authenticated;

alter table public.homepage_sections enable row level security;
alter table public.homepage_section_translations enable row level security;
alter table public.homepage_section_media enable row level security;
alter table public.homepage_feature_items enable row level security;
alter table public.homepage_feature_item_translations enable row level security;
alter table public.homepage_product_curations enable row level security;

revoke all on table public.homepage_sections from anon, authenticated;
revoke all on table public.homepage_section_translations from anon, authenticated;
revoke all on table public.homepage_section_media from anon, authenticated;
revoke all on table public.homepage_feature_items from anon, authenticated;
revoke all on table public.homepage_feature_item_translations from anon, authenticated;
revoke all on table public.homepage_product_curations from anon, authenticated;

grant select on table public.homepage_sections, public.homepage_section_translations,
  public.homepage_section_media, public.homepage_feature_items,
  public.homepage_feature_item_translations, public.homepage_product_curations
to anon, authenticated;
grant insert, update, delete on table public.homepage_sections, public.homepage_section_translations,
  public.homepage_section_media, public.homepage_feature_items,
  public.homepage_feature_item_translations, public.homepage_product_curations
to authenticated;

create policy homepage_sections_public_read on public.homepage_sections
for select to anon, authenticated using (enabled);
create policy homepage_sections_admin_all on public.homepage_sections
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy homepage_section_translations_public_read on public.homepage_section_translations
for select to anon, authenticated using (exists (
  select 1 from public.homepage_sections section
  where section.id = homepage_section_translations.homepage_section_id and section.enabled
));
create policy homepage_section_translations_admin_all on public.homepage_section_translations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy homepage_section_media_public_read on public.homepage_section_media
for select to anon, authenticated using (
  active and exists (
    select 1 from public.homepage_sections section
    where section.id = homepage_section_media.homepage_section_id and section.enabled
  )
);
create policy homepage_section_media_admin_all on public.homepage_section_media
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy homepage_feature_items_public_read on public.homepage_feature_items
for select to anon, authenticated using (
  active and exists (
    select 1 from public.homepage_sections section
    where section.id = homepage_feature_items.homepage_section_id and section.enabled
  )
);
create policy homepage_feature_items_admin_all on public.homepage_feature_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy homepage_feature_item_translations_public_read on public.homepage_feature_item_translations
for select to anon, authenticated using (exists (
  select 1
  from public.homepage_feature_items item
  join public.homepage_sections section on section.id = item.homepage_section_id
  where item.id = homepage_feature_item_translations.homepage_feature_item_id
    and item.active and section.enabled
));
create policy homepage_feature_item_translations_admin_all on public.homepage_feature_item_translations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy homepage_product_curations_public_read on public.homepage_product_curations
for select to anon, authenticated using (
  active
  and exists (
    select 1 from public.homepage_sections section
    where section.id = homepage_product_curations.homepage_section_id and section.enabled
  )
  and exists (
    select 1 from public.products product
    where product.id = homepage_product_curations.product_id
      and product.visibility = 'PUBLISHED' and product.archived_at is null
  )
);
create policy homepage_product_curations_admin_all on public.homepage_product_curations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy media_assets_public_content_read on public.media_assets;
create policy media_assets_public_content_read
on public.media_assets
for select to anon, authenticated
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
    or exists (
      select 1 from public.homepage_section_media placement
      join public.homepage_sections section on section.id = placement.homepage_section_id
      where placement.media_asset_id = media_assets.id and placement.active and section.enabled
    )
    or exists (
      select 1 from public.homepage_feature_items item
      join public.homepage_sections section on section.id = item.homepage_section_id
      where item.media_asset_id = media_assets.id and item.active and section.enabled
    )
  )
);
