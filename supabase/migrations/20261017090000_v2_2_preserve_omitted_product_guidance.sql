-- A V2.1 Admin payload omits guidance keys. Preserve each existing value unless
-- that locale explicitly supplies the key; explicit JSON null/blank clears it.
-- CREATE OR REPLACE retains the existing function identity and EXECUTE grants.
create or replace function public.admin_save_product_atomic(product_payload jsonb)
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
    update public.product_translations as translation
    set
      care_instructions = case when locale_payload ? 'care_instructions'
        then nullif(btrim(coalesce(locale_payload->>'care_instructions', '')), '')
        else translation.care_instructions end,
      freshness_seasonality_note = case when locale_payload ? 'freshness_seasonality_note'
        then nullif(btrim(coalesce(locale_payload->>'freshness_seasonality_note', '')), '')
        else translation.freshness_seasonality_note end,
      substitution_note = case when locale_payload ? 'substitution_note'
        then nullif(btrim(coalesce(locale_payload->>'substitution_note', '')), '')
        else translation.substitution_note end,
      fulfillment_note = case when locale_payload ? 'fulfillment_note'
        then nullif(btrim(coalesce(locale_payload->>'fulfillment_note', '')), '')
        else translation.fulfillment_note end
    where translation.product_id = saved_product_id and translation.locale = locale_code;
  end loop;

  return saved_product_id;
end;
$$;

comment on function public.admin_save_product_atomic(jsonb) is
  'ADMIN-only atomic Product mutation with optional localized guidance. Per field and locale, omitted keys preserve existing values; explicit JSON null or blank clears them.';
