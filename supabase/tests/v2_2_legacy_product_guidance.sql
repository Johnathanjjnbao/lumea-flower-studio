-- Run only against the disposable local CI database. Every fixture and trigger
-- is inside this transaction, which rolls back even after the pgTAP assertion.
begin;
set local search_path = public, extensions;
select plan(1);

do $$
declare
  wrapper record;
begin
  select prosecdef, proconfig into wrapper
  from pg_catalog.pg_proc
  where oid = 'public.admin_save_product_atomic(jsonb)'::pg_catalog.regprocedure;
  if not found then
    raise exception 'Product RPC wrapper is missing';
  end if;
  if wrapper.prosecdef is distinct from true then
    raise exception 'Product RPC wrapper is not SECURITY DEFINER';
  end if;
  -- PostgreSQL quotes the empty search_path list item in proconfig as "".
  if (wrapper.proconfig @> array['search_path=""']) is distinct from true then
    raise exception 'Product RPC wrapper search_path is not empty';
  end if;
  if has_function_privilege('anon', 'public.admin_save_product_atomic(jsonb)', 'EXECUTE') is distinct from false then
    raise exception 'anon can execute Product RPC wrapper';
  end if;
  if has_function_privilege('authenticated', 'public.admin_save_product_atomic(jsonb)', 'EXECUTE') is distinct from true then
    raise exception 'authenticated cannot execute Product RPC wrapper';
  end if;
  if has_function_privilege('anon', 'public.admin_save_product_atomic_v21_internal(jsonb)', 'EXECUTE') is distinct from false then
    raise exception 'anon can execute internal Product RPC';
  end if;
  if has_function_privilege('authenticated', 'public.admin_save_product_atomic_v21_internal(jsonb)', 'EXECUTE') is distinct from false then
    raise exception 'authenticated can execute internal Product RPC';
  end if;
end;
$$;

insert into public.categories (id, stable_code, slug, visibility, sort_order, published_at)
values ('23000000-0000-4000-8000-000000000001', 'v22-legacy-guidance', 'v22-legacy-guidance', 'PUBLISHED', 9300, now());
insert into public.category_translations (category_id, locale, name)
values
  ('23000000-0000-4000-8000-000000000001', 'vi', 'V2.2 Legacy Guidance'),
  ('23000000-0000-4000-8000-000000000001', 'ko', 'V2.2 기존 안내');

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '23000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'v22-legacy-admin@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '23000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'v22-legacy-user@example.invalid', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
insert into public.admin_profiles (id, auth_user_id, role, active, display_name)
values ('23000000-0000-4000-8000-000000000004', '23000000-0000-4000-8000-000000000002', 'ADMIN', true, 'V2.2 Legacy CI Admin');

-- Test-only snapshot helper. It reads only the two localized guidance rows.
create function public.v22_ci_guidance_snapshot(target_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_object_agg(translation.locale::text, jsonb_build_object(
    'care_instructions', translation.care_instructions,
    'freshness_seasonality_note', translation.freshness_seasonality_note,
    'substitution_note', translation.substitution_note,
    'fulfillment_note', translation.fulfillment_note
  ))
  from public.product_translations translation
  where translation.product_id = target_id;
$$;

-- The marker is reached only by the KO guidance UPDATE in the V2.2 wrapper:
-- the V2.1 internal upsert leaves the existing guidance value untouched.
create function public.v22_ci_fail_ko_guidance_marker()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.locale = 'ko'::public.locale_code
    and new.care_instructions = '__V22_LATE_FAILURE__' then
    raise exception using errcode = 'P0001', message = 'V22_GUIDANCE_LATE_FAILURE';
  end if;
  return new;
end;
$$;
create trigger v22_test_late_guidance_failure
before update on public.product_translations
for each row execute function public.v22_ci_fail_ko_guidance_marker();

set local role authenticated;
select set_config('request.jwt.claim.sub', '23000000-0000-4000-8000-000000000003', true);
do $$
begin
  begin
    perform public.admin_save_product_atomic('{}'::jsonb);
    raise exception 'non-ADMIN unexpectedly saved Product';
  exception when insufficient_privilege then
    if sqlerrm <> 'ADMIN_PRODUCT_FORBIDDEN' then raise; end if;
  end;
  begin
    perform public.admin_save_product_atomic_v21_internal('{}'::jsonb);
    raise exception 'authenticated browser role unexpectedly invoked the internal RPC';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '23000000-0000-4000-8000-000000000002', true);
do $$
declare
  saved_id uuid;
  legacy_product_id uuid;
  variant_id uuid;
  full_payload jsonb;
  legacy_payload jsonb;
  changed_payload jsonb;
  expected_guidance jsonb;
  before_name text;
  before_price integer;
  guidance_field text;
  guidance_locale text;
  clear_text text;
  guidance_limit integer;
begin
  full_payload := jsonb_build_object(
    'id', null,
    'stable_code', 'v22-guidance-preservation',
    'slug', 'v22-guidance-preservation',
    'product_type', 'READY_MADE_BOUQUET',
    'category_id', '23000000-0000-4000-8000-000000000001',
    'availability', 'AVAILABLE',
    'same_day_eligible', false,
    'sort_order', 9310,
    'vi', jsonb_build_object(
      'name', 'Guidance Preservation', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', '',
      'care_instructions', 'VI care',
      'freshness_seasonality_note', 'VI freshness',
      'substitution_note', 'VI substitution',
      'fulfillment_note', 'VI fulfillment'
    ),
    'ko', jsonb_build_object(
      'name', '안내 보존', 'short_description', '', 'description', '',
      'composition', jsonb_build_array(), 'seo_title', '', 'seo_description', '',
      'care_instructions', 'KO care',
      'freshness_seasonality_note', 'KO freshness',
      'substitution_note', 'KO substitution',
      'fulfillment_note', 'KO fulfillment'
    ),
    'variants', jsonb_build_array(jsonb_build_object(
      'id', null, 'stable_code', 'standard', 'sku', 'LUM-V22-PRESERVE-STANDARD',
      'price_amount', 500000, 'active', true, 'sort_order', 10,
      'vi_name', 'Tiêu chuẩn', 'ko_name', '스탠다드'
    )),
    'occasion_ids', jsonb_build_array(), 'tone_ids', jsonb_build_array()
  );
  saved_id := public.admin_save_product_atomic(full_payload);
  select id into strict variant_id from public.product_variants where product_id = saved_id;
  expected_guidance := jsonb_build_object(
    'vi', jsonb_build_object(
      'care_instructions', 'VI care', 'freshness_seasonality_note', 'VI freshness',
      'substitution_note', 'VI substitution', 'fulfillment_note', 'VI fulfillment'),
    'ko', jsonb_build_object(
      'care_instructions', 'KO care', 'freshness_seasonality_note', 'KO freshness',
      'substitution_note', 'KO substitution', 'fulfillment_note', 'KO fulfillment')
  );
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'full V2.2 create did not save all eight guidance fields';
  end if;

  full_payload := jsonb_set(full_payload, '{id}', to_jsonb(saved_id::text));
  full_payload := jsonb_set(full_payload, '{variants,0,id}', to_jsonb(variant_id::text));
  legacy_payload := jsonb_set(full_payload, '{vi}',
    (full_payload -> 'vi') - 'care_instructions' - 'freshness_seasonality_note'
      - 'substitution_note' - 'fulfillment_note');
  legacy_payload := jsonb_set(legacy_payload, '{ko}',
    (full_payload -> 'ko') - 'care_instructions' - 'freshness_seasonality_note'
      - 'substitution_note' - 'fulfillment_note');

  -- Mandatory regression: UPDATE the same populated Product with V2.1 keys.
  if public.admin_save_product_atomic(legacy_payload) <> saved_id
    or public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'legacy UPDATE erased existing VI/KO guidance';
  end if;

  changed_payload := jsonb_set(legacy_payload, '{vi,name}', to_jsonb('Legacy changed name'::text));
  changed_payload := jsonb_set(changed_payload, '{variants,0,price_amount}', '525000'::jsonb);
  perform public.admin_save_product_atomic(changed_payload);
  if (select name from public.product_translations where product_id = saved_id and locale = 'vi')
      <> 'Legacy changed name'
    or (select price_amount from public.product_variants where id = variant_id) <> 525000
    or public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'legacy name/price update did not preserve guidance';
  end if;
  legacy_payload := changed_payload;

  -- Mixed present/absent keys update independently; trimming remains intact.
  changed_payload := jsonb_set(legacy_payload, '{vi,care_instructions}', to_jsonb('  VI care revised  '::text), true);
  changed_payload := jsonb_set(changed_payload, '{ko,substitution_note}', to_jsonb('  KO substitution revised  '::text), true);
  perform public.admin_save_product_atomic(changed_payload);
  expected_guidance := jsonb_set(expected_guidance, '{vi,care_instructions}', to_jsonb('VI care revised'::text));
  expected_guidance := jsonb_set(expected_guidance, '{ko,substitution_note}', to_jsonb('KO substitution revised'::text));
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'mixed omitted and present guidance keys changed other values';
  end if;

  changed_payload := jsonb_set(legacy_payload, '{vi,substitution_note}', 'null'::jsonb, true);
  perform public.admin_save_product_atomic(changed_payload);
  expected_guidance := jsonb_set(expected_guidance, '{vi,substitution_note}', 'null'::jsonb);
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'explicit JSON null did not clear only the target field';
  end if;

  changed_payload := jsonb_set(legacy_payload, '{vi,freshness_seasonality_note}', to_jsonb(''::text), true);
  changed_payload := jsonb_set(changed_payload, '{ko,fulfillment_note}', to_jsonb('   '::text), true);
  perform public.admin_save_product_atomic(changed_payload);
  expected_guidance := jsonb_set(expected_guidance, '{vi,freshness_seasonality_note}', 'null'::jsonb);
  expected_guidance := jsonb_set(expected_guidance, '{ko,fulfillment_note}', 'null'::jsonb);
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'empty or whitespace guidance did not clear only its field';
  end if;

  changed_payload := jsonb_set(legacy_payload, '{vi,fulfillment_note}', to_jsonb('VI only'::text), true);
  perform public.admin_save_product_atomic(changed_payload);
  expected_guidance := jsonb_set(expected_guidance, '{vi,fulfillment_note}', to_jsonb('VI only'::text));
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'VI guidance changed KO guidance when KO keys were absent';
  end if;

  -- Exercise each of the four fields in both locales. Seed a non-null value
  -- before every clear so an already-null field cannot produce a false pass.
  foreach clear_text in array array[
    ''::text, ' '::text, E'\t', E' \t \t ', E'\r\n',
    E'\f\x0B', E' \t\r\n\f\x0B '
  ]
  loop
    changed_payload := legacy_payload;
    foreach guidance_locale in array array['vi', 'ko']
    loop
      foreach guidance_field in array array[
        'care_instructions', 'freshness_seasonality_note',
        'substitution_note', 'fulfillment_note'
      ]
      loop
        changed_payload := jsonb_set(changed_payload, array[guidance_locale, guidance_field],
          to_jsonb('QA seed'::text), true);
        expected_guidance := jsonb_set(expected_guidance, array[guidance_locale, guidance_field],
          to_jsonb('QA seed'::text));
      end loop;
    end loop;
    perform public.admin_save_product_atomic(changed_payload);
    if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
      raise exception 'whitespace test could not seed all VI/KO guidance fields';
    end if;

    changed_payload := legacy_payload;
    foreach guidance_locale in array array['vi', 'ko']
    loop
      foreach guidance_field in array array[
        'care_instructions', 'freshness_seasonality_note',
        'substitution_note', 'fulfillment_note'
      ]
      loop
        changed_payload := jsonb_set(changed_payload, array[guidance_locale, guidance_field],
          to_jsonb(clear_text), true);
        expected_guidance := jsonb_set(expected_guidance, array[guidance_locale, guidance_field],
          'null'::jsonb);
      end loop;
    end loop;
    perform public.admin_save_product_atomic(changed_payload);
    if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
      raise exception 'ASCII whitespace did not clear all VI/KO guidance fields: %',
        encode(convert_to(clear_text, 'UTF8'), 'hex');
    end if;
  end loop;

  changed_payload := legacy_payload;
  foreach guidance_locale in array array['vi', 'ko']
  loop
    foreach guidance_field in array array[
      'care_instructions', 'freshness_seasonality_note',
      'substitution_note', 'fulfillment_note'
    ]
    loop
      changed_payload := jsonb_set(changed_payload, array[guidance_locale, guidance_field],
        to_jsonb('QA seed'::text), true);
      expected_guidance := jsonb_set(expected_guidance, array[guidance_locale, guidance_field],
        to_jsonb('QA seed'::text));
    end loop;
  end loop;
  perform public.admin_save_product_atomic(changed_payload);
  changed_payload := legacy_payload;
  foreach guidance_locale in array array['vi', 'ko']
  loop
    foreach guidance_field in array array[
      'care_instructions', 'freshness_seasonality_note',
      'substitution_note', 'fulfillment_note'
    ]
    loop
      changed_payload := jsonb_set(changed_payload, array[guidance_locale, guidance_field],
        'null'::jsonb, true);
      expected_guidance := jsonb_set(expected_guidance, array[guidance_locale, guidance_field],
        'null'::jsonb);
    end loop;
  end loop;
  perform public.admin_save_product_atomic(changed_payload);
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'explicit JSON null did not clear all VI/KO guidance fields';
  end if;

  -- Only boundaries are normalized. Internal tab and LF must remain intact.
  changed_payload := legacy_payload;
  foreach guidance_locale in array array['vi', 'ko']
  loop
    foreach guidance_field in array array[
      'care_instructions', 'freshness_seasonality_note',
      'substitution_note', 'fulfillment_note'
    ]
    loop
      changed_payload := jsonb_set(changed_payload, array[guidance_locale, guidance_field],
        to_jsonb(E'\t \rQA A\t B\nC\f \x0B'::text), true);
      expected_guidance := jsonb_set(expected_guidance, array[guidance_locale, guidance_field],
        to_jsonb(E'QA A\t B\nC'::text));
    end loop;
  end loop;
  perform public.admin_save_product_atomic(changed_payload);
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'boundary trimming changed meaningful internal whitespace';
  end if;
  perform public.admin_save_product_atomic(legacy_payload);
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'legacy payload erased normalized guidance';
  end if;

  -- Length limits apply after boundary normalization, but not to internal text.
  changed_payload := legacy_payload;
  foreach guidance_locale in array array['vi', 'ko']
  loop
    foreach guidance_field in array array[
      'care_instructions', 'freshness_seasonality_note',
      'substitution_note', 'fulfillment_note'
    ]
    loop
      guidance_limit := case when guidance_field = 'care_instructions' then 8000 else 4000 end;
      changed_payload := jsonb_set(changed_payload, array[guidance_locale, guidance_field],
        to_jsonb((E'\t' || repeat('x', guidance_limit) || E'\x0B')::text), true);
      expected_guidance := jsonb_set(expected_guidance, array[guidance_locale, guidance_field],
        to_jsonb(repeat('x', guidance_limit)));
    end loop;
  end loop;
  perform public.admin_save_product_atomic(changed_payload);
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'maximum normalized guidance length was rejected or altered';
  end if;

  foreach guidance_locale in array array['vi', 'ko']
  loop
    foreach guidance_field in array array[
      'care_instructions', 'freshness_seasonality_note',
      'substitution_note', 'fulfillment_note'
    ]
    loop
      guidance_limit := case when guidance_field = 'care_instructions' then 8000 else 4000 end;
      changed_payload := jsonb_set(legacy_payload, array[guidance_locale, guidance_field],
        to_jsonb((E'\t' || repeat('x', guidance_limit + 1) || E'\x0B')::text), true);
      begin
        perform public.admin_save_product_atomic(changed_payload);
        raise exception 'oversized normalized guidance unexpectedly saved';
      exception when invalid_parameter_value then
        if sqlerrm <> 'ADMIN_PRODUCT_GUIDANCE_INVALID' then raise; end if;
      end;
      if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
        raise exception 'oversized % % guidance altered Product data',
          guidance_locale, guidance_field;
      end if;
    end loop;
  end loop;

  changed_payload := jsonb_set(legacy_payload, '{vi,care_instructions}', '42'::jsonb, true);
  changed_payload := jsonb_set(changed_payload, '{vi,name}', to_jsonb('Invalid type changed name'::text));
  begin
    perform public.admin_save_product_atomic(changed_payload);
    raise exception 'invalid guidance JSON type unexpectedly saved';
  exception when invalid_parameter_value then
    if sqlerrm <> 'ADMIN_PRODUCT_GUIDANCE_INVALID' then raise; end if;
  end;
  if (select name from public.product_translations where product_id = saved_id and locale = 'vi')
      <> 'Legacy changed name'
    or public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'invalid type altered existing Product data';
  end if;

  changed_payload := jsonb_set(legacy_payload, '{ko,fulfillment_note}', to_jsonb(repeat('x', 4001)), true);
  begin
    perform public.admin_save_product_atomic(changed_payload);
    raise exception 'oversized guidance unexpectedly saved';
  exception when invalid_parameter_value then
    if sqlerrm <> 'ADMIN_PRODUCT_GUIDANCE_INVALID' then raise; end if;
  end;
  if public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'oversized guidance altered existing Product data';
  end if;

  -- The trigger rejects KO only after the V2.1 Product/variant writes and the
  -- preceding VI guidance UPDATE. PL/pgSQL's exception block rolls back all
  -- writes in that failed RPC statement, not merely pre-validation work.
  select name into strict before_name from public.product_translations
    where product_id = saved_id and locale = 'vi';
  select price_amount into strict before_price from public.product_variants where id = variant_id;
  changed_payload := jsonb_set(legacy_payload, '{vi,name}', to_jsonb('Must roll back'::text));
  changed_payload := jsonb_set(changed_payload, '{variants,0,price_amount}', '550000'::jsonb);
  changed_payload := jsonb_set(changed_payload, '{vi,care_instructions}', to_jsonb('Must roll back VI guidance'::text), true);
  changed_payload := jsonb_set(changed_payload, '{ko,care_instructions}', to_jsonb('__V22_LATE_FAILURE__'::text), true);
  begin
    perform public.admin_save_product_atomic(changed_payload);
    raise exception 'late guidance failure unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'V22_GUIDANCE_LATE_FAILURE' then raise; end if;
  end;
  if (select name from public.product_translations where product_id = saved_id and locale = 'vi')
      is distinct from before_name
    or (select price_amount from public.product_variants where id = variant_id)
      is distinct from before_price
    or public.v22_ci_guidance_snapshot(saved_id) is distinct from expected_guidance then
    raise exception 'late KO failure left Product, price, or VI guidance partially written';
  end if;

  -- Legacy CREATE is separate from the mandatory legacy UPDATE regression.
  changed_payload := jsonb_set(legacy_payload, '{id}', 'null'::jsonb);
  changed_payload := jsonb_set(changed_payload, '{stable_code}', to_jsonb('v22-legacy-new'::text));
  changed_payload := jsonb_set(changed_payload, '{slug}', to_jsonb('v22-legacy-new'::text));
  changed_payload := jsonb_set(changed_payload, '{variants,0,id}', 'null'::jsonb);
  changed_payload := jsonb_set(changed_payload, '{variants,0,sku}', to_jsonb('LUM-V22-LEGACY-NEW'::text));
  legacy_product_id := public.admin_save_product_atomic(changed_payload);
  if legacy_product_id is null
    or (select count(*) from public.product_translations where product_id = legacy_product_id) <> 2
    or exists (
      select 1 from public.product_translations
      where product_id = legacy_product_id
        and (care_instructions is not null or freshness_seasonality_note is not null
          or substitution_note is not null or fulfillment_note is not null)
    ) then
    raise exception 'legacy CREATE did not leave new guidance NULL';
  end if;
end;
$$;
reset role;

select pass('V2.2 legacy UPDATE preserves omitted guidance, explicit edits/clears are isolated, and late failure rolls back atomically');
select * from finish();
rollback;
