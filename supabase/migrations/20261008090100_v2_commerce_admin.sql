-- Luméa V2.1: narrow ADMIN-only atomic mutations for Category and Navigation.

create or replace function public.admin_save_category(
  target_id uuid,
  target_stable_code text,
  target_slug text,
  target_active boolean,
  target_sort_order integer,
  target_name_vi text,
  target_name_ko text,
  target_description_vi text default null,
  target_description_ko text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  existing_code text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_CATEGORY_FORBIDDEN';
  end if;
  if target_stable_code is null
    or target_stable_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or target_slug is null
    or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or target_sort_order is null
    or target_sort_order < 0
    or target_name_vi is null
    or char_length(btrim(target_name_vi)) = 0
    or target_name_ko is null
    or char_length(btrim(target_name_ko)) = 0 then
    raise exception using errcode = '22023', message = 'ADMIN_CATEGORY_INVALID';
  end if;

  if target_id is null then
    insert into public.categories (
      stable_code, slug, visibility, sort_order, published_at, archived_at
    ) values (
      target_stable_code,
      target_slug,
      case when target_active then 'PUBLISHED'::public.visibility_status else 'DRAFT'::public.visibility_status end,
      target_sort_order,
      case when target_active then now() else null end,
      null
    ) returning id into saved_id;
  else
    select stable_code into existing_code from public.categories where id = target_id for update;
    if existing_code is null then
      raise exception using errcode = 'P0002', message = 'ADMIN_CATEGORY_NOT_FOUND';
    end if;
    if existing_code <> target_stable_code then
      raise exception using errcode = '22023', message = 'ADMIN_CATEGORY_STABLE_CODE_IMMUTABLE';
    end if;
    update public.categories set
      slug = target_slug,
      visibility = case when target_active then 'PUBLISHED'::public.visibility_status else 'HIDDEN'::public.visibility_status end,
      sort_order = target_sort_order,
      published_at = case when target_active then coalesce(published_at, now()) else published_at end,
      archived_at = null
    where id = target_id
    returning id into saved_id;
  end if;

  insert into public.category_translations (category_id, locale, name, description)
  values
    (saved_id, 'vi', btrim(target_name_vi), nullif(btrim(target_description_vi), '')),
    (saved_id, 'ko', btrim(target_name_ko), nullif(btrim(target_description_ko), ''))
  on conflict (category_id, locale) do update set
    name = excluded.name,
    description = excluded.description;

  return saved_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'ADMIN_CATEGORY_IDENTITY_CONFLICT';
end;
$$;

create or replace function public.admin_archive_category(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_CATEGORY_FORBIDDEN';
  end if;
  if exists (select 1 from public.products product where product.category_id = target_id) then
    raise exception using errcode = '23503', message = 'ADMIN_CATEGORY_IN_USE';
  end if;
  update public.categories
  set visibility = 'ARCHIVED', archived_at = now()
  where id = target_id and visibility <> 'ARCHIVED';
  if not found then
    raise exception using errcode = 'P0002', message = 'ADMIN_CATEGORY_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.admin_reorder_categories(target_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  supplied_count integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_CATEGORY_FORBIDDEN';
  end if;
  if target_ids is null then
    raise exception using errcode = '22023', message = 'ADMIN_CATEGORY_ORDER_INVALID';
  end if;
  select count(*) into expected_count from public.categories where visibility <> 'ARCHIVED';
  select count(distinct value) into supplied_count from unnest(target_ids) value;
  if cardinality(target_ids) <> expected_count or supplied_count <> expected_count
    or exists (
      select 1 from unnest(target_ids) value
      where not exists (select 1 from public.categories category where category.id = value and category.visibility <> 'ARCHIVED')
    ) then
    raise exception using errcode = '22023', message = 'ADMIN_CATEGORY_ORDER_INVALID';
  end if;
  update public.categories category
  set sort_order = (ordering.position * 10)::integer
  from unnest(target_ids) with ordinality ordering(id, position)
  where category.id = ordering.id;
end;
$$;

create or replace function public.admin_save_navigation_item(
  target_id uuid,
  target_stable_code text,
  target_destination_type public.navigation_destination_type,
  target_category_id uuid,
  target_external_url text,
  target_active boolean,
  target_sort_order integer,
  target_label_vi text,
  target_label_ko text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  existing_code text;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_NAVIGATION_FORBIDDEN';
  end if;
  if target_stable_code is null
    or target_stable_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or target_destination_type is null
    or target_sort_order is null
    or target_sort_order < 0
    or target_label_vi is null
    or char_length(btrim(target_label_vi)) = 0
    or target_label_ko is null
    or char_length(btrim(target_label_ko)) = 0
    or (target_destination_type = 'CATEGORY' and target_category_id is null)
    or (target_destination_type <> 'CATEGORY' and target_category_id is not null)
    or (target_destination_type = 'EXTERNAL' and coalesce(target_external_url, '') !~ '^https://[^[:space:]]+$')
    or (target_destination_type <> 'EXTERNAL' and target_external_url is not null) then
    raise exception using errcode = '22023', message = 'ADMIN_NAVIGATION_INVALID';
  end if;
  if target_destination_type = 'CATEGORY' and not exists (
    select 1 from public.categories category
    where category.id = target_category_id
      and category.visibility <> 'ARCHIVED'
      and (not target_active or category.visibility = 'PUBLISHED')
  ) then
    raise exception using errcode = '23503', message = 'ADMIN_NAVIGATION_CATEGORY_INVALID';
  end if;

  if target_id is null then
    insert into public.navigation_items (
      stable_code, destination_type, category_id, external_url, active, sort_order
    ) values (
      target_stable_code, target_destination_type, target_category_id,
      nullif(btrim(target_external_url), ''), target_active, target_sort_order
    ) returning id into saved_id;
  else
    select stable_code into existing_code from public.navigation_items where id = target_id for update;
    if existing_code is null then
      raise exception using errcode = 'P0002', message = 'ADMIN_NAVIGATION_NOT_FOUND';
    end if;
    if existing_code <> target_stable_code then
      raise exception using errcode = '22023', message = 'ADMIN_NAVIGATION_STABLE_CODE_IMMUTABLE';
    end if;
    update public.navigation_items set
      destination_type = target_destination_type,
      category_id = target_category_id,
      external_url = nullif(btrim(target_external_url), ''),
      active = target_active,
      sort_order = target_sort_order
    where id = target_id
    returning id into saved_id;
  end if;

  insert into public.navigation_item_translations (navigation_item_id, locale, label)
  values (saved_id, 'vi', btrim(target_label_vi)), (saved_id, 'ko', btrim(target_label_ko))
  on conflict (navigation_item_id, locale) do update set label = excluded.label;

  return saved_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'ADMIN_NAVIGATION_IDENTITY_CONFLICT';
end;
$$;

create or replace function public.admin_delete_navigation_item(target_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_NAVIGATION_FORBIDDEN';
  end if;
  delete from public.navigation_items where id = target_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'ADMIN_NAVIGATION_NOT_FOUND';
  end if;
end;
$$;

create or replace function public.admin_reorder_navigation(target_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  supplied_count integer;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_NAVIGATION_FORBIDDEN';
  end if;
  if target_ids is null then
    raise exception using errcode = '22023', message = 'ADMIN_NAVIGATION_ORDER_INVALID';
  end if;
  select count(*) into expected_count from public.navigation_items;
  select count(distinct value) into supplied_count from unnest(target_ids) value;
  if cardinality(target_ids) <> expected_count or supplied_count <> expected_count
    or exists (
      select 1 from unnest(target_ids) value
      where not exists (select 1 from public.navigation_items item where item.id = value)
    ) then
    raise exception using errcode = '22023', message = 'ADMIN_NAVIGATION_ORDER_INVALID';
  end if;
  update public.navigation_items item
  set sort_order = (ordering.position * 10)::integer
  from unnest(target_ids) with ordinality ordering(id, position)
  where item.id = ordering.id;
end;
$$;

revoke all on function public.admin_save_category(uuid, text, text, boolean, integer, text, text, text, text) from public;
revoke all on function public.admin_archive_category(uuid) from public;
revoke all on function public.admin_reorder_categories(uuid[]) from public;
revoke all on function public.admin_save_navigation_item(uuid, text, public.navigation_destination_type, uuid, text, boolean, integer, text, text) from public;
revoke all on function public.admin_delete_navigation_item(uuid) from public;
revoke all on function public.admin_reorder_navigation(uuid[]) from public;

grant execute on function public.admin_save_category(uuid, text, text, boolean, integer, text, text, text, text) to authenticated;
grant execute on function public.admin_archive_category(uuid) to authenticated;
grant execute on function public.admin_reorder_categories(uuid[]) to authenticated;
grant execute on function public.admin_save_navigation_item(uuid, text, public.navigation_destination_type, uuid, text, boolean, integer, text, text) to authenticated;
grant execute on function public.admin_delete_navigation_item(uuid) to authenticated;
grant execute on function public.admin_reorder_navigation(uuid[]) to authenticated;
