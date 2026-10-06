-- Step 15: serialize Admin operations changes, reject stale saves, and preserve active checkout invariants.

create or replace function public.assert_delivery_configuration()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.delivery_settings%rowtype;
begin
  perform pg_advisory_xact_lock(19420427, 1500);
  select source.* into strict settings
  from public.delivery_settings source
  where source.singleton = true;

  if settings.delivery_enabled and (
    not exists (
      select 1
      from public.delivery_zones zone
      join public.delivery_zone_areas area on area.delivery_zone_id = zone.id and area.active
      where zone.active
    )
    or not exists (select 1 from public.delivery_windows delivery_window where delivery_window.active)
  ) then
    raise exception using errcode = '23514', message = 'ADMIN_DELIVERY_CONFIGURATION_INCOMPLETE';
  end if;

  if settings.same_day_enabled and (
    not settings.delivery_enabled
    or settings.same_day_cutoff is null
    or not exists (
      select 1
      from public.delivery_zones zone
      join public.delivery_zone_areas area on area.delivery_zone_id = zone.id and area.active
      where zone.active and zone.same_day_eligible
    )
    or not exists (
      select 1 from public.delivery_windows delivery_window
      where delivery_window.active and delivery_window.same_day_eligible
    )
  ) then
    raise exception using errcode = '23514', message = 'ADMIN_SAME_DAY_CONFIGURATION_INCOMPLETE';
  end if;
end;
$$;

revoke all on function public.assert_delivery_configuration() from public, anon, authenticated;

create or replace function public.enforce_delivery_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_delivery_configuration();
  return null;
end;
$$;

revoke all on function public.enforce_delivery_configuration() from public, anon, authenticated;

create constraint trigger delivery_settings_configuration_guard
after insert or update or delete on public.delivery_settings
deferrable initially deferred
for each row execute function public.enforce_delivery_configuration();

create constraint trigger delivery_zones_configuration_guard
after insert or update or delete on public.delivery_zones
deferrable initially deferred
for each row execute function public.enforce_delivery_configuration();

create constraint trigger delivery_zone_areas_configuration_guard
after insert or update or delete on public.delivery_zone_areas
deferrable initially deferred
for each row execute function public.enforce_delivery_configuration();

create constraint trigger delivery_windows_configuration_guard
after insert or update or delete on public.delivery_windows
deferrable initially deferred
for each row execute function public.enforce_delivery_configuration();

create or replace function public.admin_save_delivery_settings(
  expected_updated_at timestamptz,
  next_delivery_enabled boolean,
  next_pickup_enabled boolean,
  next_same_day_enabled boolean,
  next_same_day_cutoff time,
  next_pickup_name_vi text,
  next_pickup_name_ko text,
  next_pickup_address_vi text,
  next_pickup_address_ko text,
  next_pickup_hours_vi text,
  next_pickup_hours_ko text,
  next_delivery_help_vi text,
  next_delivery_help_ko text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_updated_at timestamptz;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_DELIVERY_SETTINGS_FORBIDDEN';
  end if;
  perform pg_advisory_xact_lock(19420427, 1500);
  select settings.updated_at into strict current_updated_at
  from public.delivery_settings settings
  where settings.singleton = true
  for update;
  if expected_updated_at is null or current_updated_at <> expected_updated_at then
    raise exception using errcode = '40001', message = 'ADMIN_OPERATIONS_STALE';
  end if;

  update public.delivery_settings
  set delivery_enabled = next_delivery_enabled,
      pickup_enabled = next_pickup_enabled,
      same_day_enabled = next_same_day_enabled,
      same_day_cutoff = next_same_day_cutoff,
      pickup_name_vi = nullif(btrim(next_pickup_name_vi), ''),
      pickup_name_ko = nullif(btrim(next_pickup_name_ko), ''),
      pickup_address_vi = nullif(btrim(next_pickup_address_vi), ''),
      pickup_address_ko = nullif(btrim(next_pickup_address_ko), ''),
      pickup_hours_vi = nullif(btrim(next_pickup_hours_vi), ''),
      pickup_hours_ko = nullif(btrim(next_pickup_hours_ko), ''),
      delivery_help_vi = nullif(btrim(next_delivery_help_vi), ''),
      delivery_help_ko = nullif(btrim(next_delivery_help_ko), '')
  where singleton = true
  returning updated_at into current_updated_at;
  return current_updated_at;
end;
$$;

create or replace function public.admin_save_payment_settings(
  expected_updated_at timestamptz,
  next_bank_transfer_enabled boolean,
  next_cash_enabled boolean,
  next_cash_delivery_enabled boolean,
  next_cash_pickup_enabled boolean,
  next_bank_id text,
  next_bank_name text,
  next_account_number text,
  next_account_holder text,
  next_vietqr_template text,
  next_transfer_reference_template text,
  next_payment_deadline_hours integer,
  next_bank_instructions_vi text,
  next_bank_instructions_ko text,
  next_cash_instructions_vi text,
  next_cash_instructions_ko text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_updated_at timestamptz;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_PAYMENT_SETTINGS_FORBIDDEN';
  end if;
  perform pg_advisory_xact_lock(19420427, 1501);
  select settings.updated_at into strict current_updated_at
  from public.payment_settings settings
  where settings.singleton = true
  for update;
  if expected_updated_at is null or current_updated_at <> expected_updated_at then
    raise exception using errcode = '40001', message = 'ADMIN_OPERATIONS_STALE';
  end if;

  update public.payment_settings
  set bank_transfer_enabled = next_bank_transfer_enabled,
      cash_enabled = next_cash_enabled,
      cash_delivery_enabled = next_cash_enabled and next_cash_delivery_enabled,
      cash_pickup_enabled = next_cash_enabled and next_cash_pickup_enabled,
      bank_id = nullif(btrim(next_bank_id), ''),
      bank_name = nullif(btrim(next_bank_name), ''),
      account_number = nullif(btrim(next_account_number), ''),
      account_holder = nullif(btrim(next_account_holder), ''),
      vietqr_template = nullif(btrim(next_vietqr_template), ''),
      transfer_reference_template = nullif(btrim(next_transfer_reference_template), ''),
      payment_deadline_hours = next_payment_deadline_hours,
      bank_instructions_vi = nullif(btrim(next_bank_instructions_vi), ''),
      bank_instructions_ko = nullif(btrim(next_bank_instructions_ko), ''),
      cash_instructions_vi = nullif(btrim(next_cash_instructions_vi), ''),
      cash_instructions_ko = nullif(btrim(next_cash_instructions_ko), '')
  where singleton = true
  returning updated_at into current_updated_at;
  return current_updated_at;
end;
$$;

create or replace function public.admin_save_delivery_zone_v15(
  target_zone_id uuid,
  expected_updated_at timestamptz,
  zone_stable_code text,
  zone_name_vi text,
  zone_name_ko text,
  zone_help_vi text,
  zone_help_ko text,
  zone_fee_amount bigint,
  zone_active boolean,
  zone_same_day_eligible boolean,
  zone_sort_order integer,
  zone_areas jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_updated_at timestamptz;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_DELIVERY_SETTINGS_FORBIDDEN';
  end if;
  perform pg_advisory_xact_lock(19420427, 1500);
  if target_zone_id is not null then
    select zone.updated_at into strict current_updated_at
    from public.delivery_zones zone
    where zone.id = target_zone_id
    for update;
    if expected_updated_at is null or current_updated_at <> expected_updated_at then
      raise exception using errcode = '40001', message = 'ADMIN_OPERATIONS_STALE';
    end if;
  end if;
  return public.admin_save_delivery_zone(
    target_zone_id, zone_stable_code, zone_name_vi, zone_name_ko,
    zone_help_vi, zone_help_ko, zone_fee_amount, zone_active,
    zone_same_day_eligible, zone_sort_order, zone_areas
  );
end;
$$;

create or replace function public.admin_save_delivery_window(
  target_window_id uuid,
  expected_updated_at timestamptz,
  window_stable_code text,
  window_label_vi text,
  window_label_ko text,
  window_help_vi text,
  window_help_ko text,
  window_start_time time,
  window_end_time time,
  window_active boolean,
  window_same_day_eligible boolean,
  window_sort_order integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_window_id uuid;
  current_updated_at timestamptz;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_DELIVERY_SETTINGS_FORBIDDEN';
  end if;
  perform pg_advisory_xact_lock(19420427, 1500);
  if target_window_id is null then
    insert into public.delivery_windows (
      stable_code, label_vi, label_ko, help_vi, help_ko, start_time,
      end_time, active, same_day_eligible, sort_order
    ) values (
      btrim(window_stable_code), btrim(window_label_vi), btrim(window_label_ko),
      nullif(btrim(window_help_vi), ''), nullif(btrim(window_help_ko), ''),
      window_start_time, window_end_time, window_active, window_same_day_eligible, window_sort_order
    ) returning id into saved_window_id;
  else
    select delivery_window.updated_at into strict current_updated_at
    from public.delivery_windows delivery_window
    where delivery_window.id = target_window_id
    for update;
    if expected_updated_at is null or current_updated_at <> expected_updated_at then
      raise exception using errcode = '40001', message = 'ADMIN_OPERATIONS_STALE';
    end if;
    update public.delivery_windows
    set stable_code = btrim(window_stable_code),
        label_vi = btrim(window_label_vi),
        label_ko = btrim(window_label_ko),
        help_vi = nullif(btrim(window_help_vi), ''),
        help_ko = nullif(btrim(window_help_ko), ''),
        start_time = window_start_time,
        end_time = window_end_time,
        active = window_active,
        same_day_eligible = window_same_day_eligible,
        sort_order = window_sort_order
    where id = target_window_id
    returning id into saved_window_id;
  end if;
  return saved_window_id;
end;
$$;

revoke insert, update, delete on table public.delivery_settings from authenticated;
revoke insert, update, delete on table public.delivery_zones from authenticated;
revoke insert, update, delete on table public.delivery_zone_translations from authenticated;
revoke insert, update, delete on table public.delivery_zone_areas from authenticated;
revoke insert, update, delete on table public.delivery_windows from authenticated;
revoke insert, update, delete on table public.payment_settings from authenticated;

revoke all on function public.admin_save_delivery_zone(
  uuid, text, text, text, text, text, bigint, boolean, boolean, integer, jsonb
) from public, anon, authenticated;
revoke all on function public.admin_save_delivery_settings(
  timestamptz, boolean, boolean, boolean, time, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.admin_save_payment_settings(
  timestamptz, boolean, boolean, boolean, boolean, text, text, text, text, text, text, integer, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.admin_save_delivery_zone_v15(
  uuid, timestamptz, text, text, text, text, text, bigint, boolean, boolean, integer, jsonb
) from public, anon, authenticated;
revoke all on function public.admin_save_delivery_window(
  uuid, timestamptz, text, text, text, text, text, time, time, boolean, boolean, integer
) from public, anon, authenticated;

grant execute on function public.admin_save_delivery_settings(
  timestamptz, boolean, boolean, boolean, time, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.admin_save_payment_settings(
  timestamptz, boolean, boolean, boolean, boolean, text, text, text, text, text, text, integer, text, text, text, text
) to authenticated;
grant execute on function public.admin_save_delivery_zone_v15(
  uuid, timestamptz, text, text, text, text, text, bigint, boolean, boolean, integer, jsonb
) to authenticated;
grant execute on function public.admin_save_delivery_window(
  uuid, timestamptz, text, text, text, text, text, time, time, boolean, boolean, integer
) to authenticated;
