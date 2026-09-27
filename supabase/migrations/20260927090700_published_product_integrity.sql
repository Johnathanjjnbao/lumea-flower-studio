-- Keep an already-published Product publication-ready after related content
-- mutations. Deferrable constraint triggers allow the primary-image RPC to
-- replace a primary atomically inside one transaction.

create or replace function public.enforce_published_product_relation_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  issues text[];
begin
  if tg_table_name = 'product_translations' then
    target_id := coalesce(new.product_id, old.product_id);
  elsif tg_table_name = 'product_variants' then
    target_id := coalesce(new.product_id, old.product_id);
  elsif tg_table_name = 'product_images' then
    target_id := coalesce(new.product_id, old.product_id);
  else
    raise exception 'Unsupported publication-integrity relation: %', tg_table_name;
  end if;

  if exists (
    select 1 from public.products product
    where product.id = target_id and product.visibility = 'PUBLISHED'
  ) then
    issues := public.product_publication_issues(target_id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Published Product would become invalid: %', array_to_string(issues, ', ');
    end if;
  end if;
  return null;
end;
$$;

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
    where image.media_asset_id = coalesce(new.id, old.id)
      and product.visibility = 'PUBLISHED'
  loop
    issues := public.product_publication_issues(target_id);
    if coalesce(cardinality(issues), 0) > 0 then
      raise exception 'Published Product would become invalid: %', array_to_string(issues, ', ');
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger product_translations_preserve_published_readiness
after insert or update or delete on public.product_translations
deferrable initially deferred
for each row execute function public.enforce_published_product_relation_integrity();

create constraint trigger product_variants_preserve_published_readiness
after insert or update or delete on public.product_variants
deferrable initially deferred
for each row execute function public.enforce_published_product_relation_integrity();

create constraint trigger product_images_preserve_published_readiness
after insert or update or delete on public.product_images
deferrable initially deferred
for each row execute function public.enforce_published_product_relation_integrity();

create constraint trigger media_assets_preserve_published_readiness
after update or delete on public.media_assets
deferrable initially deferred
for each row execute function public.enforce_published_product_media_integrity();

revoke all on function public.enforce_published_product_relation_integrity() from public;
revoke all on function public.enforce_published_product_media_integrity() from public;
