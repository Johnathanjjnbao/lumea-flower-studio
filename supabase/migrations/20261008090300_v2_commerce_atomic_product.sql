-- Luméa V2.1: commit the Product editor's commerce mutation as one database
-- transaction. Media remains a separate lifecycle because Storage uploads are
-- intentionally not part of the Product metadata save.

create or replace function public.admin_save_product_atomic(product_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_product_id uuid;
  target_stable_code text;
  target_slug text;
  target_product_type public.product_type;
  target_category_id uuid;
  target_category_visibility public.visibility_status;
  target_availability public.availability_status;
  target_same_day boolean;
  target_sort_order integer;
  original_visibility public.visibility_status := 'DRAFT';
  existing_stable_code text;
  locale_code public.locale_code;
  locale_payload jsonb;
  locale_name text;
  composition_items text[];
  variant_payload jsonb;
  variant_id uuid;
  variant_stable_code text;
  variant_sku text;
  variant_price bigint;
  variant_active boolean;
  variant_sort_order integer;
  variant_name_vi text;
  variant_name_ko text;
  retained_variant_ids uuid[] := '{}'::uuid[];
  target_occasion_ids uuid[] := '{}'::uuid[];
  target_tone_ids uuid[] := '{}'::uuid[];
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_PRODUCT_FORBIDDEN';
  end if;

  if product_payload is null
    or jsonb_typeof(product_payload) <> 'object'
    or jsonb_typeof(product_payload->'stable_code') <> 'string'
    or jsonb_typeof(product_payload->'slug') <> 'string'
    or jsonb_typeof(product_payload->'product_type') <> 'string'
    or jsonb_typeof(product_payload->'category_id') <> 'string'
    or jsonb_typeof(product_payload->'availability') <> 'string'
    or jsonb_typeof(product_payload->'same_day_eligible') <> 'boolean'
    or jsonb_typeof(product_payload->'sort_order') <> 'number'
    or jsonb_typeof(product_payload->'vi') <> 'object'
    or jsonb_typeof(product_payload->'ko') <> 'object'
    or jsonb_typeof(product_payload->'variants') <> 'array'
    or jsonb_typeof(product_payload->'occasion_ids') <> 'array'
    or jsonb_typeof(product_payload->'tone_ids') <> 'array'
    or jsonb_array_length(product_payload->'variants') > 100
    or jsonb_array_length(product_payload->'occasion_ids') > 100
    or jsonb_array_length(product_payload->'tone_ids') > 100 then
    raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_INVALID';
  end if;

  target_stable_code := btrim(product_payload->>'stable_code');
  target_slug := btrim(product_payload->>'slug');
  if target_stable_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(target_stable_code) > 120
    or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(target_slug) > 120
    or product_payload->>'product_type' not in ('READY_MADE_BOUQUET', 'FLORIST_CHOICE', 'CUSTOM_BOUQUET')
    or product_payload->>'availability' not in ('AVAILABLE', 'SEASONAL', 'UNAVAILABLE')
    or product_payload->>'sort_order' !~ '^[0-9]+$'
    or (product_payload->>'sort_order')::bigint > 1000000 then
    raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_INVALID';
  end if;

  target_product_type := (product_payload->>'product_type')::public.product_type;
  target_category_id := (product_payload->>'category_id')::uuid;
  target_availability := (product_payload->>'availability')::public.availability_status;
  target_same_day := (product_payload->>'same_day_eligible')::boolean;
  target_sort_order := (product_payload->>'sort_order')::integer;

  select category.visibility into target_category_visibility
  from public.categories category
  where category.id = target_category_id and category.archived_at is null
  for share;
  if target_category_visibility is null then
    raise exception using errcode = '23503', message = 'ADMIN_PRODUCT_CATEGORY_INVALID';
  end if;

  if product_payload ? 'id' and product_payload->'id' <> 'null'::jsonb then
    if jsonb_typeof(product_payload->'id') <> 'string' then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_INVALID';
    end if;
    saved_product_id := (product_payload->>'id')::uuid;
    select product.stable_code, product.visibility
      into existing_stable_code, original_visibility
    from public.products product
    where product.id = saved_product_id
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'ADMIN_PRODUCT_NOT_FOUND';
    end if;
    if original_visibility = 'ARCHIVED' then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_ARCHIVED';
    end if;
    if existing_stable_code <> target_stable_code then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_STABLE_CODE_IMMUTABLE';
    end if;
    if original_visibility = 'PUBLISHED' and target_category_visibility <> 'PUBLISHED' then
      raise exception using errcode = '23503', message = 'ADMIN_PRODUCT_CATEGORY_NOT_PUBLISHED';
    end if;
    if original_visibility = 'PUBLISHED' then
      update public.products set visibility = 'HIDDEN' where id = saved_product_id;
    end if;
    update public.products set
      slug = target_slug,
      product_type = target_product_type,
      category_id = target_category_id,
      availability = target_availability,
      same_day_eligible = target_same_day,
      sort_order = target_sort_order
    where id = saved_product_id;
  else
    insert into public.products (
      stable_code, slug, product_type, category_id, availability,
      same_day_eligible, sort_order, visibility
    ) values (
      target_stable_code, target_slug, target_product_type, target_category_id,
      target_availability, target_same_day, target_sort_order, 'DRAFT'
    ) returning id into saved_product_id;
  end if;

  foreach locale_code in array array['vi', 'ko']::public.locale_code[]
  loop
    locale_payload := product_payload->(locale_code::text);
    if jsonb_typeof(locale_payload->'name') <> 'string'
      or jsonb_typeof(locale_payload->'composition') <> 'array'
      or jsonb_array_length(locale_payload->'composition') > 50
      or exists (
        select 1 from jsonb_array_elements(locale_payload->'composition') item
        where jsonb_typeof(item) <> 'string'
      ) then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_TRANSLATION_INVALID';
    end if;
    locale_name := btrim(locale_payload->>'name');
    if char_length(locale_name) > 200
      or char_length(coalesce(locale_payload->>'short_description', '')) > 1000
      or char_length(coalesce(locale_payload->>'description', '')) > 20000
      or char_length(coalesce(locale_payload->>'seo_title', '')) > 300
      or char_length(coalesce(locale_payload->>'seo_description', '')) > 1000
      or exists (
        select 1 from jsonb_array_elements_text(locale_payload->'composition') value
        where char_length(value) > 300
      ) then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_TRANSLATION_INVALID';
    end if;
    if locale_name = '' then
      delete from public.product_translations
      where product_id = saved_product_id and locale = locale_code;
    else
      select coalesce(array_agg(btrim(value)) filter (where btrim(value) <> ''), '{}'::text[])
        into composition_items
      from jsonb_array_elements_text(locale_payload->'composition') value;
      insert into public.product_translations (
        product_id, locale, name, short_description, description,
        composition, seo_title, seo_description
      ) values (
        saved_product_id, locale_code, locale_name,
        nullif(btrim(locale_payload->>'short_description'), ''),
        nullif(btrim(locale_payload->>'description'), ''),
        composition_items,
        nullif(btrim(locale_payload->>'seo_title'), ''),
        nullif(btrim(locale_payload->>'seo_description'), '')
      )
      on conflict (product_id, locale) do update set
        name = excluded.name,
        short_description = excluded.short_description,
        description = excluded.description,
        composition = excluded.composition,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description;
    end if;
  end loop;

  if exists (
    select 1 from jsonb_array_elements(product_payload->'variants') item
    group by item->>'id' having item->>'id' is not null and count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(product_payload->'variants') item
    group by item->>'stable_code' having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(product_payload->'variants') item
    group by item->>'sku' having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_VARIANT_DUPLICATE';
  end if;

  for variant_payload in select value from jsonb_array_elements(product_payload->'variants')
  loop
    if jsonb_typeof(variant_payload) <> 'object'
      or jsonb_typeof(variant_payload->'stable_code') <> 'string'
      or jsonb_typeof(variant_payload->'sku') <> 'string'
      or jsonb_typeof(variant_payload->'price_amount') <> 'number'
      or jsonb_typeof(variant_payload->'active') <> 'boolean'
      or jsonb_typeof(variant_payload->'sort_order') <> 'number'
      or jsonb_typeof(variant_payload->'vi_name') <> 'string'
      or jsonb_typeof(variant_payload->'ko_name') <> 'string' then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_VARIANT_INVALID';
    end if;

    variant_stable_code := btrim(variant_payload->>'stable_code');
    variant_sku := btrim(variant_payload->>'sku');
    variant_name_vi := btrim(variant_payload->>'vi_name');
    variant_name_ko := btrim(variant_payload->>'ko_name');
    if variant_stable_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or char_length(variant_stable_code) > 120
      or variant_sku !~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
      or char_length(variant_sku) > 96
      or variant_payload->>'price_amount' !~ '^[0-9]+$'
      or (variant_payload->>'price_amount')::numeric > 2147483647
      or variant_payload->>'sort_order' !~ '^[0-9]+$'
      or (variant_payload->>'sort_order')::bigint > 1000000
      or variant_name_vi = '' or char_length(variant_name_vi) > 200
      or variant_name_ko = '' or char_length(variant_name_ko) > 200 then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_VARIANT_INVALID';
    end if;
    variant_price := (variant_payload->>'price_amount')::bigint;
    variant_active := (variant_payload->>'active')::boolean;
    variant_sort_order := (variant_payload->>'sort_order')::integer;

    if variant_payload ? 'id' and variant_payload->'id' <> 'null'::jsonb then
      if jsonb_typeof(variant_payload->'id') <> 'string' then
        raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_VARIANT_INVALID';
      end if;
      variant_id := (variant_payload->>'id')::uuid;
      update public.product_variants set
        stable_code = variant_stable_code,
        sku = variant_sku,
        price_amount = variant_price::integer,
        active = variant_active,
        sort_order = variant_sort_order
      where id = variant_id and product_id = saved_product_id;
      if not found then
        raise exception using errcode = 'P0002', message = 'ADMIN_PRODUCT_VARIANT_NOT_FOUND';
      end if;
    else
      insert into public.product_variants (
        product_id, stable_code, sku, price_amount, active, sort_order
      ) values (
        saved_product_id, variant_stable_code, variant_sku,
        variant_price::integer, variant_active, variant_sort_order
      ) returning id into variant_id;
    end if;
    retained_variant_ids := array_append(retained_variant_ids, variant_id);
    insert into public.product_variant_translations (product_variant_id, locale, name)
    values
      (variant_id, 'vi', variant_name_vi),
      (variant_id, 'ko', variant_name_ko)
    on conflict (product_variant_id, locale) do update set name = excluded.name;
  end loop;

  update public.product_variants
  set active = false
  where product_id = saved_product_id
    and not (id = any(retained_variant_ids));

  select coalesce(array_agg(value::uuid order by ordinality), '{}'::uuid[])
    into target_occasion_ids
  from jsonb_array_elements_text(product_payload->'occasion_ids') with ordinality item(value, ordinality);
  select coalesce(array_agg(value::uuid order by ordinality), '{}'::uuid[])
    into target_tone_ids
  from jsonb_array_elements_text(product_payload->'tone_ids') with ordinality item(value, ordinality);
  if cardinality(target_occasion_ids) <> (select count(distinct id) from unnest(target_occasion_ids) id)
    or cardinality(target_tone_ids) <> (select count(distinct id) from unnest(target_tone_ids) id)
    or exists (
      select 1 from unnest(target_occasion_ids) id
      where not exists (
        select 1 from public.occasions occasion
        where occasion.id = id and occasion.visibility <> 'ARCHIVED'
      )
    )
    or exists (
      select 1 from unnest(target_tone_ids) id
      where not exists (
        select 1 from public.tones tone
        where tone.id = id and tone.visibility <> 'ARCHIVED'
      )
    ) then
    raise exception using errcode = '23503', message = 'ADMIN_PRODUCT_TAXONOMY_INVALID';
  end if;

  delete from public.product_occasions where product_id = saved_product_id;
  insert into public.product_occasions (product_id, occasion_id, sort_order)
  select saved_product_id, id, (ordinality - 1)::integer
  from unnest(target_occasion_ids) with ordinality item(id, ordinality);
  delete from public.product_tones where product_id = saved_product_id;
  insert into public.product_tones (product_id, tone_id, sort_order, active)
  select saved_product_id, id, (ordinality - 1)::integer, true
  from unnest(target_tone_ids) with ordinality item(id, ordinality);

  if original_visibility = 'PUBLISHED' then
    update public.products set visibility = 'PUBLISHED' where id = saved_product_id;
  end if;
  return saved_product_id;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'ADMIN_PRODUCT_IDENTITY_CONFLICT';
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_INVALID';
end;
$$;

comment on function public.admin_save_product_atomic(jsonb) is
  'ADMIN-only atomic Product metadata, canonical Category, Variant/SKU, translation, Occasion, and Tone mutation.';

revoke all on function public.admin_save_product_atomic(jsonb) from public, anon;
grant execute on function public.admin_save_product_atomic(jsonb) to authenticated;
