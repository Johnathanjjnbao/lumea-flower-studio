-- Luméa V2.1: stable SKU, first-class Category, and managed Navigation.
-- Keeps Occasion as the existing M:N shopping taxonomy and adds the documented
-- primary Product -> Category relationship without rewriting V1 history.

alter table public.product_variants add column sku text;

update public.product_variants variant
set sku = upper('LUM-' || product.stable_code || '-' || variant.stable_code)
from public.products product
where product.id = variant.product_id;

alter table public.product_variants
  alter column sku set not null,
  add constraint product_variants_sku_unique unique (sku),
  add constraint product_variants_sku_format check (
    char_length(sku) between 3 and 96
    and sku ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
  );

comment on column public.product_variants.sku is
  'Globally unique, stable orderable SKU. Independent from localized display names.';

create or replace function public.enforce_product_variant_sku_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.sku is distinct from new.sku then
    raise exception using errcode = '22023', message = 'PRODUCT_VARIANT_SKU_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger product_variants_sku_immutable
before update of sku on public.product_variants
for each row execute function public.enforce_product_variant_sku_immutable();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  slug text not null unique,
  visibility public.visibility_status not null default 'DRAFT',
  sort_order integer not null default 0,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_sort_order_nonnegative check (sort_order >= 0),
  constraint categories_published_at_present check (visibility <> 'PUBLISHED' or published_at is not null),
  constraint categories_archived_at_present check (visibility <> 'ARCHIVED' or archived_at is not null)
);

create table public.category_translations (
  category_id uuid not null references public.categories (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category_id, locale),
  constraint category_translations_name_not_blank check (char_length(btrim(name)) > 0)
);

create or replace function public.enforce_stable_code_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.stable_code is distinct from new.stable_code then
    raise exception using errcode = '22023', message = 'STABLE_CODE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger categories_stable_code_immutable
before update of stable_code on public.categories
for each row execute function public.enforce_stable_code_immutable();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger category_translations_set_updated_at
before update on public.category_translations
for each row execute function public.set_updated_at();

insert into public.categories (stable_code, slug, visibility, sort_order, published_at)
values ('bouquets', 'bouquets', 'PUBLISHED', 10, now())
on conflict (stable_code) do update set
  slug = excluded.slug,
  visibility = 'PUBLISHED',
  sort_order = excluded.sort_order,
  published_at = coalesce(public.categories.published_at, excluded.published_at),
  archived_at = null;

insert into public.category_translations (category_id, locale, name, description)
select category.id, translation.locale::public.locale_code, translation.name, translation.description
from public.categories category
cross join (values
  ('vi', 'Hoa bó', 'Các thiết kế hoa bó có thể đặt trực tuyến.'),
  ('ko', '꽃다발', '온라인으로 주문할 수 있는 꽃다발 디자인입니다.')
) as translation(locale, name, description)
where category.stable_code = 'bouquets'
on conflict (category_id, locale) do update set
  name = excluded.name,
  description = excluded.description;

alter table public.products add column category_id uuid;

update public.products
set category_id = (select id from public.categories where stable_code = 'bouquets')
where category_id is null;

alter table public.products
  alter column category_id set not null,
  add constraint products_category_id_fkey foreign key (category_id)
    references public.categories (id) on delete restrict;

create index categories_public_order_idx
  on public.categories (sort_order, id)
  where visibility = 'PUBLISHED' and archived_at is null;
create index category_translations_locale_idx on public.category_translations (locale, category_id);
create index products_category_idx on public.products (category_id, sort_order, id);

drop policy products_public_read on public.products;
create policy products_public_read
on public.products
for select
to anon, authenticated
using (
  visibility = 'PUBLISHED'
  and archived_at is null
  and exists (
    select 1 from public.categories category
    where category.id = products.category_id
      and category.visibility = 'PUBLISHED'
      and category.archived_at is null
  )
);

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
    case when not exists (
      select 1
      from public.product_translations translation
      where translation.product_id = product.id
        and translation.locale = 'ko'
        and char_length(btrim(translation.name)) > 0
    ) then 'missing_ko_translation' end,
    case when not exists (
      select 1 from public.categories category
      where category.id = product.category_id
        and category.visibility = 'PUBLISHED'
        and category.archived_at is null
    ) then 'missing_published_category' end,
    case when product.product_type in ('READY_MADE_BOUQUET', 'FLORIST_CHOICE') and not exists (
      select 1
      from public.product_variants variant
      where variant.product_id = product.id
        and variant.active
        and variant.price_amount >= 0
        and char_length(btrim(variant.sku)) > 0
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

create type public.navigation_destination_type as enum (
  'HOME',
  'CATALOG',
  'CATEGORY',
  'BUILDER',
  'OCCASIONS',
  'SAME_DAY',
  'ABOUT',
  'VISIT',
  'EXTERNAL'
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  destination_type public.navigation_destination_type not null,
  category_id uuid references public.categories (id) on delete restrict,
  external_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_items_stable_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint navigation_items_sort_order_nonnegative check (sort_order >= 0),
  constraint navigation_items_destination_shape check (
    (destination_type = 'CATEGORY' and category_id is not null and external_url is null)
    or (destination_type = 'EXTERNAL' and category_id is null and external_url ~ '^https://[^[:space:]]+$')
    or (destination_type not in ('CATEGORY', 'EXTERNAL') and category_id is null and external_url is null)
  )
);

create table public.navigation_item_translations (
  navigation_item_id uuid not null references public.navigation_items (id) on delete cascade,
  locale public.locale_code not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (navigation_item_id, locale),
  constraint navigation_item_translations_label_not_blank check (char_length(btrim(label)) > 0)
);

create trigger navigation_items_stable_code_immutable
before update of stable_code on public.navigation_items
for each row execute function public.enforce_stable_code_immutable();

create trigger navigation_items_set_updated_at
before update on public.navigation_items
for each row execute function public.set_updated_at();

create trigger navigation_item_translations_set_updated_at
before update on public.navigation_item_translations
for each row execute function public.set_updated_at();

insert into public.navigation_items (stable_code, destination_type, active, sort_order)
values
  ('flowers', 'CATALOG', true, 10),
  ('occasions', 'OCCASIONS', true, 20),
  ('custom', 'BUILDER', true, 30),
  ('same-day', 'SAME_DAY', true, 40),
  ('about', 'ABOUT', true, 50),
  ('visit', 'VISIT', true, 60)
on conflict (stable_code) do nothing;

insert into public.navigation_item_translations (navigation_item_id, locale, label)
select item.id, translation.locale::public.locale_code, translation.label
from public.navigation_items item
join (values
  ('flowers', 'vi', 'Hoa'), ('flowers', 'ko', '꽃'),
  ('occasions', 'vi', 'Theo dịp'), ('occasions', 'ko', '용도별'),
  ('custom', 'vi', 'Tạo bó hoa'), ('custom', 'ko', '꽃다발 만들기'),
  ('same-day', 'vi', 'Giao trong ngày'), ('same-day', 'ko', '당일 배송'),
  ('about', 'vi', 'Về Luméa'), ('about', 'ko', 'Luméa 이야기'),
  ('visit', 'vi', 'Ghé studio'), ('visit', 'ko', '스튜디오')
) as translation(stable_code, locale, label) on translation.stable_code = item.stable_code
on conflict (navigation_item_id, locale) do update set label = excluded.label;

create index navigation_items_public_order_idx on public.navigation_items (active, sort_order, id);
create index navigation_items_category_idx on public.navigation_items (category_id) where category_id is not null;
create index navigation_item_translations_locale_idx on public.navigation_item_translations (locale, navigation_item_id);

alter table public.categories enable row level security;
alter table public.category_translations enable row level security;
alter table public.navigation_items enable row level security;
alter table public.navigation_item_translations enable row level security;

create policy categories_public_read on public.categories
for select to anon, authenticated
using (visibility = 'PUBLISHED' and archived_at is null);

create policy categories_admin_all on public.categories
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy category_translations_public_read on public.category_translations
for select to anon, authenticated
using (exists (
  select 1 from public.categories category
  where category.id = category_translations.category_id
    and category.visibility = 'PUBLISHED'
    and category.archived_at is null
));

create policy category_translations_admin_all on public.category_translations
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy navigation_items_public_read on public.navigation_items
for select to anon, authenticated
using (
  active
  and (
    destination_type <> 'CATEGORY'
    or exists (
      select 1 from public.categories category
      where category.id = navigation_items.category_id
        and category.visibility = 'PUBLISHED'
        and category.archived_at is null
    )
  )
);

create policy navigation_items_admin_all on public.navigation_items
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy navigation_item_translations_public_read on public.navigation_item_translations
for select to anon, authenticated
using (exists (
  select 1 from public.navigation_items item
  where item.id = navigation_item_translations.navigation_item_id
    and item.active
    and (
      item.destination_type <> 'CATEGORY'
      or exists (
        select 1 from public.categories category
        where category.id = item.category_id
          and category.visibility = 'PUBLISHED'
          and category.archived_at is null
      )
    )
));

create policy navigation_item_translations_admin_all on public.navigation_item_translations
for all to authenticated
using (public.is_admin()) with check (public.is_admin());

revoke all on table public.categories from anon, authenticated;
revoke all on table public.category_translations from anon, authenticated;
revoke all on table public.navigation_items from anon, authenticated;
revoke all on table public.navigation_item_translations from anon, authenticated;

grant select on table public.categories to anon, authenticated;
grant select on table public.category_translations to anon, authenticated;
grant select on table public.navigation_items to anon, authenticated;
grant select on table public.navigation_item_translations to anon, authenticated;

comment on table public.categories is
  'Primary public catalog grouping. Product belongs to exactly one Category; Occasion remains a separate M:N taxonomy.';
comment on table public.navigation_items is
  'ADMIN-managed storefront menu with bounded destination types; internal route strings are derived by the frontend.';
