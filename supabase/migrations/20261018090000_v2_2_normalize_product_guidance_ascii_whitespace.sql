-- Normalize only ASCII space, tab, LF, CR, form feed, and vertical tab at
-- Product-guidance boundaries. PostgreSQL E-strings use \x0B for vertical tab.
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
      or char_length(btrim(coalesce(locale_payload->>'care_instructions', ''), E' \t\n\r\f\x0B')) > 8000
      or char_length(btrim(coalesce(locale_payload->>'freshness_seasonality_note', ''), E' \t\n\r\f\x0B')) > 4000
      or char_length(btrim(coalesce(locale_payload->>'substitution_note', ''), E' \t\n\r\f\x0B')) > 4000
      or char_length(btrim(coalesce(locale_payload->>'fulfillment_note', ''), E' \t\n\r\f\x0B')) > 4000 then
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
        then nullif(btrim(coalesce(locale_payload->>'care_instructions', ''), E' \t\n\r\f\x0B'), '')
        else translation.care_instructions end,
      freshness_seasonality_note = case when locale_payload ? 'freshness_seasonality_note'
        then nullif(btrim(coalesce(locale_payload->>'freshness_seasonality_note', ''), E' \t\n\r\f\x0B'), '')
        else translation.freshness_seasonality_note end,
      substitution_note = case when locale_payload ? 'substitution_note'
        then nullif(btrim(coalesce(locale_payload->>'substitution_note', ''), E' \t\n\r\f\x0B'), '')
        else translation.substitution_note end,
      fulfillment_note = case when locale_payload ? 'fulfillment_note'
        then nullif(btrim(coalesce(locale_payload->>'fulfillment_note', ''), E' \t\n\r\f\x0B'), '')
        else translation.fulfillment_note end
    where translation.product_id = saved_product_id and translation.locale = locale_code;
  end loop;

  return saved_product_id;
end;
$$;

comment on function public.admin_save_product_atomic(jsonb) is
  'ADMIN-only atomic Product mutation with optional localized guidance. Omitted keys preserve values; explicit JSON null or ASCII-whitespace-only text clears them.';
