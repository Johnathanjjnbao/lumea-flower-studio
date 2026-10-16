-- Luméa V2.2: preserve the reviewed V2.1 Product mutation and wrap it with
-- optional localized guidance in the same database transaction.

alter function public.admin_save_product_atomic(jsonb)
  rename to admin_save_product_atomic_v21_internal;

revoke all on function public.admin_save_product_atomic_v21_internal(jsonb)
  from public, anon, authenticated;

create function public.admin_save_product_atomic(product_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_product_id uuid;
  locale_code public.locale_code;
  locale_payload jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_PRODUCT_FORBIDDEN';
  end if;

  if product_payload is null or jsonb_typeof(product_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_INVALID';
  end if;

  foreach locale_code in array array['vi', 'ko']::public.locale_code[]
  loop
    locale_payload := product_payload->(locale_code::text);
    if jsonb_typeof(locale_payload) <> 'object'
      or (
        locale_payload ? 'care_instructions'
        and jsonb_typeof(locale_payload->'care_instructions') not in ('string', 'null')
      )
      or (
        locale_payload ? 'freshness_seasonality_note'
        and jsonb_typeof(locale_payload->'freshness_seasonality_note') not in ('string', 'null')
      )
      or (
        locale_payload ? 'substitution_note'
        and jsonb_typeof(locale_payload->'substitution_note') not in ('string', 'null')
      )
      or (
        locale_payload ? 'fulfillment_note'
        and jsonb_typeof(locale_payload->'fulfillment_note') not in ('string', 'null')
      )
      or char_length(coalesce(locale_payload->>'care_instructions', '')) > 8000
      or char_length(coalesce(locale_payload->>'freshness_seasonality_note', '')) > 4000
      or char_length(coalesce(locale_payload->>'substitution_note', '')) > 4000
      or char_length(coalesce(locale_payload->>'fulfillment_note', '')) > 4000 then
      raise exception using errcode = '22023', message = 'ADMIN_PRODUCT_GUIDANCE_INVALID';
    end if;
  end loop;

  saved_product_id := public.admin_save_product_atomic_v21_internal(product_payload);

  foreach locale_code in array array['vi', 'ko']::public.locale_code[]
  loop
    locale_payload := product_payload->(locale_code::text);
    update public.product_translations
    set
      care_instructions = nullif(btrim(coalesce(locale_payload->>'care_instructions', '')), ''),
      freshness_seasonality_note = nullif(btrim(coalesce(locale_payload->>'freshness_seasonality_note', '')), ''),
      substitution_note = nullif(btrim(coalesce(locale_payload->>'substitution_note', '')), ''),
      fulfillment_note = nullif(btrim(coalesce(locale_payload->>'fulfillment_note', '')), '')
    where product_id = saved_product_id and locale = locale_code;
  end loop;

  return saved_product_id;
end;
$$;

comment on function public.admin_save_product_atomic(jsonb) is
  'ADMIN-only atomic Product mutation with optional V2.2 localized care, freshness, substitution, and fulfillment guidance.';
comment on function public.admin_save_product_atomic_v21_internal(jsonb) is
  'Internal V2.1 Product mutation retained for backward-compatible V2.2 transactional wrapping.';

revoke all on function public.admin_save_product_atomic(jsonb) from public, anon;
grant execute on function public.admin_save_product_atomic(jsonb) to authenticated;
