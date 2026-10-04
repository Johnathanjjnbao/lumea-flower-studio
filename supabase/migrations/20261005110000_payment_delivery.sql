-- Step 14: Admin-managed fulfillment/payment configuration and authoritative totals.

create table public.delivery_settings (
  singleton boolean primary key default true,
  delivery_enabled boolean not null default false,
  pickup_enabled boolean not null default false,
  same_day_enabled boolean not null default false,
  same_day_cutoff time,
  pickup_name_vi text,
  pickup_name_ko text,
  pickup_address_vi text,
  pickup_address_ko text,
  pickup_hours_vi text,
  pickup_hours_ko text,
  delivery_help_vi text,
  delivery_help_ko text,
  updated_at timestamptz not null default now(),
  constraint delivery_settings_singleton check (singleton),
  constraint delivery_settings_same_day_cutoff check (not same_day_enabled or same_day_cutoff is not null),
  constraint delivery_settings_pickup_copy check (
    not pickup_enabled or (
      nullif(btrim(pickup_name_vi), '') is not null
      and nullif(btrim(pickup_name_ko), '') is not null
      and nullif(btrim(pickup_address_vi), '') is not null
      and nullif(btrim(pickup_address_ko), '') is not null
      and nullif(btrim(pickup_hours_vi), '') is not null
      and nullif(btrim(pickup_hours_ko), '') is not null
    )
  )
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  fee_amount bigint not null,
  active boolean not null default false,
  same_day_eligible boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_zones_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint delivery_zones_fee_range check (fee_amount between 0 and 9999999999999),
  constraint delivery_zones_sort_nonnegative check (sort_order >= 0)
);

create table public.delivery_zone_translations (
  delivery_zone_id uuid not null references public.delivery_zones (id) on delete cascade,
  locale public.locale_code not null,
  name text not null,
  help_text text,
  primary key (delivery_zone_id, locale),
  constraint delivery_zone_translations_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint delivery_zone_translations_help_length check (help_text is null or char_length(help_text) <= 500)
);

create table public.delivery_zone_areas (
  id uuid primary key default gen_random_uuid(),
  delivery_zone_id uuid not null references public.delivery_zones (id) on delete cascade,
  stable_code text not null unique,
  name_vi text not null,
  name_ko text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_zone_areas_code_format check (stable_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint delivery_zone_areas_vi_name_length check (char_length(btrim(name_vi)) between 1 and 120),
  constraint delivery_zone_areas_ko_name_length check (char_length(btrim(name_ko)) between 1 and 120),
  constraint delivery_zone_areas_sort_nonnegative check (sort_order >= 0)
);

create table public.delivery_windows (
  id uuid primary key default gen_random_uuid(),
  stable_code text not null unique,
  start_time time not null,
  end_time time not null,
  label_vi text not null,
  label_ko text not null,
  help_vi text,
  help_ko text,
  active boolean not null default false,
  same_day_eligible boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_windows_time_order check (start_time < end_time),
  constraint delivery_windows_vi_label_length check (char_length(btrim(label_vi)) between 1 and 120),
  constraint delivery_windows_ko_label_length check (char_length(btrim(label_ko)) between 1 and 120),
  constraint delivery_windows_vi_help_length check (help_vi is null or char_length(help_vi) <= 500),
  constraint delivery_windows_ko_help_length check (help_ko is null or char_length(help_ko) <= 500),
  constraint delivery_windows_sort_nonnegative check (sort_order >= 0)
);

create table public.payment_settings (
  singleton boolean primary key default true,
  bank_transfer_enabled boolean not null default false,
  cash_enabled boolean not null default false,
  cash_delivery_enabled boolean not null default false,
  cash_pickup_enabled boolean not null default false,
  bank_id text,
  bank_name text,
  account_number text,
  account_holder text,
  vietqr_template text,
  transfer_reference_template text,
  payment_deadline_hours integer,
  bank_instructions_vi text,
  bank_instructions_ko text,
  cash_instructions_vi text,
  cash_instructions_ko text,
  updated_at timestamptz not null default now(),
  constraint payment_settings_singleton check (singleton),
  constraint payment_settings_bank_id check (bank_id is null or bank_id ~ '^[A-Za-z0-9]{2,20}$'),
  constraint payment_settings_account_number check (account_number is null or account_number ~ '^[A-Za-z0-9]{1,19}$'),
  constraint payment_settings_vietqr_template check (vietqr_template is null or vietqr_template ~ '^[A-Za-z0-9_-]{1,40}$'),
  constraint payment_settings_reference_template check (
    transfer_reference_template is null
    or transfer_reference_template ~ '^[A-Za-z0-9 ]*\{order_number\}[A-Za-z0-9 ]*$'
  ),
  constraint payment_settings_deadline check (payment_deadline_hours is null or payment_deadline_hours between 1 and 720),
  constraint payment_settings_bank_ready check (
    not bank_transfer_enabled or (
      nullif(btrim(bank_id), '') is not null
      and nullif(btrim(bank_name), '') is not null
      and nullif(btrim(account_number), '') is not null
      and nullif(btrim(account_holder), '') is not null
      and nullif(btrim(vietqr_template), '') is not null
      and nullif(btrim(transfer_reference_template), '') is not null
      and nullif(btrim(bank_instructions_vi), '') is not null
      and nullif(btrim(bank_instructions_ko), '') is not null
    )
  ),
  constraint payment_settings_cash_ready check (
    not cash_enabled or (
      (cash_delivery_enabled or cash_pickup_enabled)
      and
      nullif(btrim(cash_instructions_vi), '') is not null
      and nullif(btrim(cash_instructions_ko), '') is not null
    )
  ),
  constraint payment_settings_cash_flags check (cash_enabled or (not cash_delivery_enabled and not cash_pickup_enabled))
);

insert into public.delivery_settings (singleton) values (true);
insert into public.payment_settings (singleton) values (true);

create index delivery_zones_active_order_idx on public.delivery_zones (active, sort_order, id);
create index delivery_zone_areas_zone_order_idx on public.delivery_zone_areas (delivery_zone_id, active, sort_order, id);
create index delivery_windows_active_order_idx on public.delivery_windows (active, sort_order, id);

create trigger delivery_settings_set_updated_at
before update on public.delivery_settings
for each row execute function public.set_updated_at();
create trigger delivery_zones_set_updated_at
before update on public.delivery_zones
for each row execute function public.set_updated_at();
create trigger delivery_zone_areas_set_updated_at
before update on public.delivery_zone_areas
for each row execute function public.set_updated_at();
create trigger delivery_windows_set_updated_at
before update on public.delivery_windows
for each row execute function public.set_updated_at();
create trigger payment_settings_set_updated_at
before update on public.payment_settings
for each row execute function public.set_updated_at();

alter table public.orders
  add column requested_fulfillment_date date,
  add column delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  add column delivery_zone_code_snapshot text,
  add column delivery_zone_name_snapshot text,
  add column delivery_area_id uuid references public.delivery_zone_areas (id) on delete set null,
  add column delivery_area_code_snapshot text,
  add column delivery_area_name_snapshot text,
  add column delivery_window_id uuid references public.delivery_windows (id) on delete set null,
  add column delivery_window_label_snapshot text,
  add column pickup_name_snapshot text,
  add column pickup_address_snapshot text,
  add column pickup_hours_snapshot text;

update public.orders source_order
set requested_fulfillment_date = delivery.requested_date
from public.deliveries delivery
where delivery.order_id = source_order.id;

alter table public.orders
  alter column requested_fulfillment_date set default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  alter column requested_fulfillment_date set not null,
  add constraint orders_fulfillment_snapshot_shape check (
    (
      fulfillment_type = 'DELIVERY'
      and delivery_fee_amount is null
      and delivery_zone_code_snapshot is null
      and delivery_area_code_snapshot is null
      and pickup_address_snapshot is null
    )
    or (
      fulfillment_type = 'DELIVERY'
      and delivery_fee_amount is not null
      and delivery_zone_code_snapshot is not null
      and delivery_zone_name_snapshot is not null
      and delivery_area_code_snapshot is not null
      and delivery_area_name_snapshot is not null
      and delivery_window_label_snapshot is not null
      and pickup_address_snapshot is null
    )
    or (
      fulfillment_type = 'PICKUP'
      and delivery_fee_amount = 0
      and delivery_zone_code_snapshot is null
      and delivery_area_code_snapshot is null
      and pickup_name_snapshot is not null
      and pickup_address_snapshot is not null
      and pickup_hours_snapshot is not null
    )
  );

alter table public.order_addresses
  add column source_delivery_area_id uuid references public.delivery_zone_areas (id) on delete set null,
  add column zone_name_snapshot text,
  add column area_name_snapshot text;

alter table public.deliveries
  add column source_delivery_window_id uuid references public.delivery_windows (id) on delete set null,
  add column window_label_snapshot text;

alter table public.payments
  add column payment_reference text,
  add column bank_id_snapshot text,
  add column bank_name_snapshot text,
  add column account_number_snapshot text,
  add column account_holder_snapshot text,
  add column vietqr_template_snapshot text,
  add column instruction_snapshot text,
  add column payment_deadline_at timestamptz,
  add column paid_at timestamptz,
  add constraint payments_reference_length check (payment_reference is null or char_length(payment_reference) between 1 and 50);

update public.payments
set paid_at = updated_at
where status = 'PAID' and paid_at is null;

alter table public.payments
  add constraint payments_paid_state check ((status = 'PAID' and paid_at is not null) or status <> 'PAID');

create unique index payments_reference_unique_idx
  on public.payments (payment_reference)
  where payment_reference is not null;

create table public.payment_status_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  from_status public.payment_status,
  to_status public.payment_status not null,
  actor_admin_id uuid references public.admin_profiles (id) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  constraint payment_status_events_reason_length check (reason is null or char_length(reason) <= 500)
);

create table public.delivery_status_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete restrict,
  from_status public.delivery_status,
  to_status public.delivery_status not null,
  actor_admin_id uuid references public.admin_profiles (id) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  constraint delivery_status_events_reason_length check (reason is null or char_length(reason) <= 500)
);

create index payment_status_events_payment_idx on public.payment_status_events (payment_id, created_at, id);
create index delivery_status_events_delivery_idx on public.delivery_status_events (delivery_id, created_at, id);

alter table public.delivery_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.delivery_zone_translations enable row level security;
alter table public.delivery_zone_areas enable row level security;
alter table public.delivery_windows enable row level security;
alter table public.payment_settings enable row level security;
alter table public.payment_status_events enable row level security;
alter table public.delivery_status_events enable row level security;

revoke all on table public.delivery_settings from anon, authenticated;
revoke all on table public.delivery_zones from anon, authenticated;
revoke all on table public.delivery_zone_translations from anon, authenticated;
revoke all on table public.delivery_zone_areas from anon, authenticated;
revoke all on table public.delivery_windows from anon, authenticated;
revoke all on table public.payment_settings from anon, authenticated;
revoke all on table public.payment_status_events from anon, authenticated;
revoke all on table public.delivery_status_events from anon, authenticated;

grant select, insert, update, delete on table public.delivery_settings to authenticated;
grant select, insert, update, delete on table public.delivery_zones to authenticated;
grant select, insert, update, delete on table public.delivery_zone_translations to authenticated;
grant select, insert, update, delete on table public.delivery_zone_areas to authenticated;
grant select, insert, update, delete on table public.delivery_windows to authenticated;
grant select, insert, update, delete on table public.payment_settings to authenticated;
grant select on table public.payment_status_events to authenticated;
grant select on table public.delivery_status_events to authenticated;
grant select (
  requested_fulfillment_date, delivery_zone_id, delivery_zone_code_snapshot,
  delivery_zone_name_snapshot, delivery_area_id, delivery_area_code_snapshot,
  delivery_area_name_snapshot, delivery_window_id, delivery_window_label_snapshot,
  pickup_name_snapshot, pickup_address_snapshot, pickup_hours_snapshot
) on table public.orders to authenticated;

create policy delivery_settings_admin_all on public.delivery_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy delivery_zones_admin_all on public.delivery_zones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy delivery_zone_translations_admin_all on public.delivery_zone_translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy delivery_zone_areas_admin_all on public.delivery_zone_areas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy delivery_windows_admin_all on public.delivery_windows for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy payment_settings_admin_all on public.payment_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy payment_status_events_admin_read on public.payment_status_events for select to authenticated
  using (public.is_admin());
create policy delivery_status_events_admin_read on public.delivery_status_events for select to authenticated
  using (public.is_admin());

create or replace function public.admin_save_delivery_zone(
  target_zone_id uuid,
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
  saved_zone_id uuid;
  area_payload jsonb;
  area_id uuid;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_DELIVERY_SETTINGS_FORBIDDEN';
  end if;
  if jsonb_typeof(zone_areas) <> 'array' or jsonb_array_length(zone_areas) > 200 then
    raise exception using errcode = '22023', message = 'ADMIN_DELIVERY_ZONE_AREAS_INVALID';
  end if;
  if zone_active and not exists (
    select 1 from jsonb_array_elements(zone_areas) area
    where area->>'active' = 'true'
  ) then
    raise exception using errcode = '22023', message = 'ADMIN_DELIVERY_ZONE_ACTIVE_AREA_REQUIRED';
  end if;

  if target_zone_id is null then
    insert into public.delivery_zones (stable_code, fee_amount, active, same_day_eligible, sort_order)
    values (btrim(zone_stable_code), zone_fee_amount, zone_active, zone_same_day_eligible, zone_sort_order)
    returning id into saved_zone_id;
  else
    perform 1 from public.delivery_zones where id = target_zone_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'ADMIN_DELIVERY_ZONE_NOT_FOUND'; end if;
    update public.delivery_zones
    set stable_code = btrim(zone_stable_code), fee_amount = zone_fee_amount, active = zone_active,
        same_day_eligible = zone_same_day_eligible, sort_order = zone_sort_order
    where id = target_zone_id
    returning id into saved_zone_id;
  end if;

  insert into public.delivery_zone_translations (delivery_zone_id, locale, name, help_text)
  values
    (saved_zone_id, 'vi', btrim(zone_name_vi), nullif(btrim(zone_help_vi), '')),
    (saved_zone_id, 'ko', btrim(zone_name_ko), nullif(btrim(zone_help_ko), ''))
  on conflict (delivery_zone_id, locale) do update
  set name = excluded.name, help_text = excluded.help_text;

  delete from public.delivery_zone_areas existing_area
  where existing_area.delivery_zone_id = saved_zone_id
    and not exists (
      select 1 from jsonb_array_elements(zone_areas) submitted_area
      where jsonb_typeof(submitted_area->'id') = 'string'
        and submitted_area->>'id' = existing_area.id::text
    );

  for area_payload in select value from jsonb_array_elements(zone_areas)
  loop
    if jsonb_typeof(area_payload) <> 'object'
      or not (area_payload ?& array['id', 'stable_code', 'name_vi', 'name_ko', 'active', 'sort_order'])
      or exists (
        select 1 from jsonb_object_keys(area_payload) area_key
        where area_key not in ('id', 'stable_code', 'name_vi', 'name_ko', 'active', 'sort_order')
      )
      or jsonb_typeof(area_payload->'stable_code') <> 'string'
      or jsonb_typeof(area_payload->'name_vi') <> 'string'
      or jsonb_typeof(area_payload->'name_ko') <> 'string'
      or jsonb_typeof(area_payload->'active') <> 'boolean'
      or jsonb_typeof(area_payload->'sort_order') <> 'number'
      or area_payload->>'sort_order' !~ '^\d+$'
      or (jsonb_typeof(area_payload->'id') not in ('null', 'string')) then
      raise exception using errcode = '22023', message = 'ADMIN_DELIVERY_ZONE_AREA_INVALID';
    end if;

    if jsonb_typeof(area_payload->'id') = 'null' then
      insert into public.delivery_zone_areas (
        delivery_zone_id, stable_code, name_vi, name_ko, active, sort_order
      ) values (
        saved_zone_id, btrim(area_payload->>'stable_code'), btrim(area_payload->>'name_vi'),
        btrim(area_payload->>'name_ko'), (area_payload->>'active')::boolean,
        (area_payload->>'sort_order')::integer
      );
    else
      if area_payload->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception using errcode = '22023', message = 'ADMIN_DELIVERY_ZONE_AREA_INVALID';
      end if;
      area_id := (area_payload->>'id')::uuid;
      perform 1 from public.delivery_zone_areas
      where id = area_id and delivery_zone_id = saved_zone_id for update;
      if not found then raise exception using errcode = 'P0002', message = 'ADMIN_DELIVERY_ZONE_AREA_NOT_FOUND'; end if;
      update public.delivery_zone_areas
      set stable_code = btrim(area_payload->>'stable_code'), name_vi = btrim(area_payload->>'name_vi'),
          name_ko = btrim(area_payload->>'name_ko'), active = (area_payload->>'active')::boolean,
          sort_order = (area_payload->>'sort_order')::integer
      where id = area_id;
    end if;
  end loop;

  return saved_zone_id;
end;
$$;

revoke all on function public.admin_save_delivery_zone(
  uuid, text, text, text, text, text, bigint, boolean, boolean, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.admin_save_delivery_zone(
  uuid, text, text, text, text, text, bigint, boolean, boolean, integer, jsonb
) to authenticated;

create or replace function public.get_checkout_options(requested_locale public.locale_code)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'delivery_enabled', settings.delivery_enabled,
    'pickup_enabled', settings.pickup_enabled,
    'same_day_enabled', settings.same_day_enabled,
    'same_day_cutoff', settings.same_day_cutoff,
    'delivery_help', case when requested_locale = 'ko' then settings.delivery_help_ko else settings.delivery_help_vi end,
    'pickup', case when settings.pickup_enabled then jsonb_build_object(
      'name', case when requested_locale = 'ko' then settings.pickup_name_ko else settings.pickup_name_vi end,
      'address', case when requested_locale = 'ko' then settings.pickup_address_ko else settings.pickup_address_vi end,
      'hours', case when requested_locale = 'ko' then settings.pickup_hours_ko else settings.pickup_hours_vi end
    ) else null end,
    'zones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', zone.id,
        'code', zone.stable_code,
        'name', translation.name,
        'help', translation.help_text,
        'fee_amount', zone.fee_amount,
        'same_day_eligible', zone.same_day_eligible,
        'areas', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', area.id,
            'code', area.stable_code,
            'name', case when requested_locale = 'ko' then area.name_ko else area.name_vi end
          ) order by area.sort_order, area.id)
          from public.delivery_zone_areas area
          where area.delivery_zone_id = zone.id and area.active
        ), '[]'::jsonb)
      ) order by zone.sort_order, zone.id)
      from public.delivery_zones zone
      join public.delivery_zone_translations translation
        on translation.delivery_zone_id = zone.id and translation.locale = requested_locale
      where zone.active
    ), '[]'::jsonb),
    'windows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', delivery_window.id,
        'code', delivery_window.stable_code,
        'label', case when requested_locale = 'ko' then delivery_window.label_ko else delivery_window.label_vi end,
        'help', case when requested_locale = 'ko' then delivery_window.help_ko else delivery_window.help_vi end,
        'start_time', delivery_window.start_time,
        'end_time', delivery_window.end_time,
        'same_day_eligible', delivery_window.same_day_eligible
      ) order by delivery_window.sort_order, delivery_window.id)
      from public.delivery_windows delivery_window
      where delivery_window.active
    ), '[]'::jsonb),
    'payment_methods', jsonb_build_object(
      'bank_transfer', payments.bank_transfer_enabled,
      'cash', payments.cash_enabled,
      'cash_delivery', payments.cash_delivery_enabled,
      'cash_pickup', payments.cash_pickup_enabled
    )
  )
  from public.delivery_settings settings
  cross join public.payment_settings payments
  where settings.singleton and payments.singleton;
$$;

revoke all on function public.get_checkout_options(public.locale_code) from public, anon, authenticated;
grant execute on function public.get_checkout_options(public.locale_code) to anon, authenticated;

alter function public.create_checkout_order(jsonb, uuid, bigint)
  rename to create_checkout_order_v12_internal;
revoke all on function public.create_checkout_order_v12_internal(jsonb, uuid, bigint)
  from public, anon, authenticated;

create function public.create_checkout_order(
  checkout_payload jsonb,
  checkout_idempotency_key uuid,
  reviewed_subtotal bigint
)
returns table (
  order_id uuid,
  order_number text,
  subtotal_amount bigint,
  delivery_fee_amount bigint,
  total_amount bigint,
  order_status public.order_status,
  payment_status public.payment_status,
  payment_method public.payment_method,
  fulfillment_type public.fulfillment_type,
  fulfillment_name text,
  delivery_area_name text,
  delivery_window_label text,
  payment_reference text,
  bank_id text,
  bank_name text,
  account_number text,
  account_holder text,
  vietqr_template text,
  payment_instruction text,
  payment_deadline_at timestamptz,
  placed_at timestamptz,
  was_duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_fingerprint text;
  existing_order public.orders%rowtype;
  existing_payment public.payments%rowtype;
  settings public.delivery_settings%rowtype;
  payment_config public.payment_settings%rowtype;
  selected_zone public.delivery_zones%rowtype;
  selected_area public.delivery_zone_areas%rowtype;
  selected_window public.delivery_windows%rowtype;
  requested_fulfillment public.fulfillment_type;
  requested_payment public.payment_method;
  delivery_payload jsonb;
  review_payload jsonb;
  legacy_payload jsonb;
  requested_date date;
  authoritative_fee bigint;
  authoritative_total bigint;
  localized_zone_name text;
  localized_area_name text;
  localized_window_label text;
  localized_pickup_name text;
  localized_pickup_address text;
  localized_pickup_hours text;
  localized_instruction text;
  generated_reference text;
  generated_deadline timestamptz;
  created record;
  created_payment_id uuid;
begin
  if checkout_idempotency_key is null or reviewed_subtotal is null or reviewed_subtotal < 0 then
    raise exception using errcode = '22023', message = 'CHECKOUT_REQUEST_INVALID';
  end if;
  if checkout_payload is null or jsonb_typeof(checkout_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYLOAD_INVALID';
  end if;
  if not (checkout_payload ?& array['locale', 'buyer', 'recipient', 'delivery', 'card_message', 'payment_method', 'review', 'items'])
    or exists (
      select 1 from jsonb_object_keys(checkout_payload) payload_key
      where payload_key not in ('locale', 'buyer', 'recipient', 'delivery', 'card_message', 'payment_method', 'review', 'items')
    ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYLOAD_FIELDS_INVALID';
  end if;
  if checkout_payload->>'locale' not in ('vi', 'ko') then
    raise exception using errcode = '22023', message = 'CHECKOUT_LOCALE_INVALID';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(checkout_idempotency_key::text, 0));
  original_fingerprint := md5(checkout_payload::text || ':' || reviewed_subtotal::text);

  select source_order.* into existing_order
  from public.orders source_order
  where source_order.idempotency_key_hash = md5(checkout_idempotency_key::text);
  if found then
    if existing_order.request_fingerprint <> original_fingerprint then
      raise exception using errcode = '22023', message = 'CHECKOUT_IDEMPOTENCY_REUSED';
    end if;
    select source_payment.* into existing_payment
    from public.payments source_payment where source_payment.order_id = existing_order.id;
    return query select
      existing_order.id, existing_order.order_number, existing_order.subtotal_amount,
      existing_order.delivery_fee_amount, existing_order.total_amount, existing_order.status,
      existing_payment.status, existing_payment.method, existing_order.fulfillment_type,
      coalesce(existing_order.delivery_zone_name_snapshot, existing_order.pickup_name_snapshot),
      existing_order.delivery_area_name_snapshot, existing_order.delivery_window_label_snapshot,
      existing_payment.payment_reference, existing_payment.bank_id_snapshot,
      existing_payment.bank_name_snapshot, existing_payment.account_number_snapshot,
      existing_payment.account_holder_snapshot, existing_payment.vietqr_template_snapshot,
      existing_payment.instruction_snapshot, existing_payment.payment_deadline_at,
      existing_order.placed_at, true;
    return;
  end if;

  delivery_payload := checkout_payload->'delivery';
  review_payload := checkout_payload->'review';
  if jsonb_typeof(delivery_payload) <> 'object'
    or not (delivery_payload ?& array['fulfillment_type', 'area_id', 'window_id', 'address', 'notes', 'requested_date'])
    or exists (
      select 1 from jsonb_object_keys(delivery_payload) delivery_key
      where delivery_key not in ('fulfillment_type', 'area_id', 'window_id', 'address', 'notes', 'requested_date')
    ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_INVALID';
  end if;
  if delivery_payload->>'fulfillment_type' not in ('DELIVERY', 'PICKUP') then
    raise exception using errcode = '22023', message = 'CHECKOUT_FULFILLMENT_INVALID';
  end if;
  requested_fulfillment := (delivery_payload->>'fulfillment_type')::public.fulfillment_type;
  if checkout_payload->>'payment_method' not in ('BANK_TRANSFER', 'CASH') then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYMENT_METHOD_INVALID';
  end if;
  requested_payment := (checkout_payload->>'payment_method')::public.payment_method;
  if jsonb_typeof(review_payload) <> 'object'
    or not (review_payload ?& array['delivery_fee', 'total'])
    or exists (select 1 from jsonb_object_keys(review_payload) review_key where review_key not in ('delivery_fee', 'total'))
    or jsonb_typeof(review_payload->'delivery_fee') <> 'number'
    or review_payload->>'delivery_fee' !~ '^\d+$'
    or jsonb_typeof(review_payload->'total') <> 'number'
    or review_payload->>'total' !~ '^\d+$' then
    raise exception using errcode = '22023', message = 'CHECKOUT_REVIEW_TOTAL_INVALID';
  end if;
  begin
    requested_date := (delivery_payload->>'requested_date')::date;
  exception when others then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_DATE_INVALID';
  end;

  select source_settings.* into settings from public.delivery_settings source_settings where source_settings.singleton;
  select source_payments.* into payment_config from public.payment_settings source_payments where source_payments.singleton;
  if settings.singleton is null or payment_config.singleton is null then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_CONFIGURATION_UNAVAILABLE';
  end if;
  if requested_payment = 'BANK_TRANSFER' and not payment_config.bank_transfer_enabled
    or requested_payment = 'CASH' and (
      not payment_config.cash_enabled
      or requested_fulfillment = 'DELIVERY' and not payment_config.cash_delivery_enabled
      or requested_fulfillment = 'PICKUP' and not payment_config.cash_pickup_enabled
    ) then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_PAYMENT_METHOD_UNAVAILABLE';
  end if;

  if requested_fulfillment = 'DELIVERY' then
    if not settings.delivery_enabled
      or jsonb_typeof(delivery_payload->'area_id') <> 'string'
      or delivery_payload->>'area_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(delivery_payload->'window_id') <> 'string'
      or delivery_payload->>'window_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_UNAVAILABLE';
    end if;

    select zone.* into selected_zone
    from public.delivery_zones zone
    where zone.id = (
      select area.delivery_zone_id from public.delivery_zone_areas area
      where area.id = (delivery_payload->>'area_id')::uuid and area.active
    ) and zone.active
      and exists (
        select 1 from public.delivery_zone_translations translation
        where translation.delivery_zone_id = zone.id
          and translation.locale = (checkout_payload->>'locale')::public.locale_code
      );
    if selected_zone.id is null then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_AREA_UNAVAILABLE';
    end if;
    select area.* into selected_area from public.delivery_zone_areas area
    where area.id = (delivery_payload->>'area_id')::uuid
      and area.delivery_zone_id = selected_zone.id and area.active;
    select delivery_window.* into selected_window from public.delivery_windows delivery_window
    where delivery_window.id = (delivery_payload->>'window_id')::uuid and delivery_window.active;
    if selected_window.id is null then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_WINDOW_UNAVAILABLE';
    end if;

    if requested_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date and (
      not settings.same_day_enabled
      or not selected_zone.same_day_eligible
      or not selected_window.same_day_eligible
      or settings.same_day_cutoff is null
      or (now() at time zone 'Asia/Ho_Chi_Minh')::time >= settings.same_day_cutoff
    ) then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_SAME_DAY_UNAVAILABLE';
    end if;

    authoritative_fee := selected_zone.fee_amount;
    select translation.name into localized_zone_name
    from public.delivery_zone_translations translation
    where translation.delivery_zone_id = selected_zone.id
      and translation.locale = (checkout_payload->>'locale')::public.locale_code;
    localized_area_name := case when checkout_payload->>'locale' = 'ko' then selected_area.name_ko else selected_area.name_vi end;
    localized_window_label := case when checkout_payload->>'locale' = 'ko' then selected_window.label_ko else selected_window.label_vi end;
    if jsonb_typeof(delivery_payload->'address') <> 'string'
      or char_length(btrim(delivery_payload->>'address')) not between 5 and 500 then
      raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_INVALID';
    end if;
  else
    if not settings.pickup_enabled
      or delivery_payload->'area_id' <> 'null'::jsonb
      or delivery_payload->'window_id' <> 'null'::jsonb then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_PICKUP_UNAVAILABLE';
    end if;
    authoritative_fee := 0;
    localized_pickup_name := case when checkout_payload->>'locale' = 'ko' then settings.pickup_name_ko else settings.pickup_name_vi end;
    localized_pickup_address := case when checkout_payload->>'locale' = 'ko' then settings.pickup_address_ko else settings.pickup_address_vi end;
    localized_pickup_hours := case when checkout_payload->>'locale' = 'ko' then settings.pickup_hours_ko else settings.pickup_hours_vi end;
  end if;

  if (review_payload->>'delivery_fee')::bigint <> authoritative_fee
    or (review_payload->>'total')::bigint <> reviewed_subtotal + authoritative_fee then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_DELIVERY_REVIEW_CHANGED';
  end if;

  legacy_payload := jsonb_set(checkout_payload - 'review', '{delivery}', jsonb_build_object(
    'address', case when requested_fulfillment = 'DELIVERY' then delivery_payload->>'address' else localized_pickup_address end,
    'notes', delivery_payload->'notes',
    'requested_date', delivery_payload->>'requested_date'
  ));

  select * into created
  from public.create_checkout_order_v12_internal(legacy_payload, checkout_idempotency_key, reviewed_subtotal);
  authoritative_total := created.subtotal_amount + authoritative_fee;
  if requested_payment = 'BANK_TRANSFER' and authoritative_total > 9999999999999 then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYMENT_AMOUNT_UNSUPPORTED';
  end if;

  update public.orders
  set fulfillment_type = requested_fulfillment,
      requested_fulfillment_date = requested_date,
      delivery_fee_amount = authoritative_fee,
      total_amount = authoritative_total,
      delivery_zone_id = case when requested_fulfillment = 'DELIVERY' then selected_zone.id else null end,
      delivery_zone_code_snapshot = case when requested_fulfillment = 'DELIVERY' then selected_zone.stable_code else null end,
      delivery_zone_name_snapshot = localized_zone_name,
      delivery_area_id = case when requested_fulfillment = 'DELIVERY' then selected_area.id else null end,
      delivery_area_code_snapshot = case when requested_fulfillment = 'DELIVERY' then selected_area.stable_code else null end,
      delivery_area_name_snapshot = localized_area_name,
      delivery_window_id = case when requested_fulfillment = 'DELIVERY' then selected_window.id else null end,
      delivery_window_label_snapshot = localized_window_label,
      pickup_name_snapshot = localized_pickup_name,
      pickup_address_snapshot = localized_pickup_address,
      pickup_hours_snapshot = localized_pickup_hours,
      request_fingerprint = original_fingerprint
  where id = created.order_id;

  if requested_fulfillment = 'DELIVERY' then
    update public.order_addresses target_address
    set source_delivery_area_id = selected_area.id,
        zone_name_snapshot = localized_zone_name,
        area_name_snapshot = localized_area_name
    where target_address.order_id = created.order_id;
    update public.deliveries target_delivery
    set requested_window = localized_window_label,
        source_delivery_window_id = selected_window.id,
        window_label_snapshot = localized_window_label
    where target_delivery.order_id = created.order_id
    returning id into created_payment_id;
    insert into public.delivery_status_events (delivery_id, from_status, to_status, reason)
    values (created_payment_id, null, 'PENDING', 'DELIVERY_CREATED');
  else
    delete from public.order_addresses target_address where target_address.order_id = created.order_id;
    delete from public.deliveries target_delivery where target_delivery.order_id = created.order_id;
  end if;

  if requested_payment = 'BANK_TRANSFER' then
    generated_reference := replace(
      payment_config.transfer_reference_template,
      '{order_number}',
      replace(created.order_number, '-', '')
    );
    if generated_reference !~ '^[A-Za-z0-9 ]{1,50}$' then
      raise exception using errcode = 'P0001', message = 'CHECKOUT_PAYMENT_REFERENCE_INVALID';
    end if;
    generated_deadline := case when payment_config.payment_deadline_hours is null then null
      else created.placed_at + make_interval(hours => payment_config.payment_deadline_hours) end;
    localized_instruction := case when checkout_payload->>'locale' = 'ko'
      then payment_config.bank_instructions_ko else payment_config.bank_instructions_vi end;
  else
    localized_instruction := case when checkout_payload->>'locale' = 'ko'
      then payment_config.cash_instructions_ko else payment_config.cash_instructions_vi end;
  end if;

  update public.payments target_payment
  set amount = authoritative_total,
      payment_reference = generated_reference,
      bank_id_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_id else null end,
      bank_name_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_name else null end,
      account_number_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.account_number else null end,
      account_holder_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.account_holder else null end,
      vietqr_template_snapshot = case when requested_payment = 'BANK_TRANSFER' then payment_config.vietqr_template else null end,
      instruction_snapshot = localized_instruction,
      payment_deadline_at = generated_deadline
  where target_payment.order_id = created.order_id
  returning id into created_payment_id;

  insert into public.payment_status_events (payment_id, from_status, to_status, reason)
  values (created_payment_id, null, 'UNPAID', 'PAYMENT_CREATED');

  return query select
    created.order_id, created.order_number, created.subtotal_amount,
    authoritative_fee, authoritative_total, created.order_status,
    created.payment_status, created.payment_method, requested_fulfillment,
    coalesce(localized_zone_name, localized_pickup_name), localized_area_name,
    localized_window_label, generated_reference,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_id else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.bank_name else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.account_number else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.account_holder else null end,
    case when requested_payment = 'BANK_TRANSFER' then payment_config.vietqr_template else null end,
    localized_instruction, generated_deadline, created.placed_at, false;
end;
$$;

comment on function public.create_checkout_order(jsonb, uuid, bigint) is
  'Creates one guest order atomically. Catalog prices, delivery fee, total, payment eligibility, and safe payment snapshots are server-authoritative.';
revoke all on function public.create_checkout_order(jsonb, uuid, bigint) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb, uuid, bigint) to anon;

create or replace function public.admin_mark_payment_paid(
  target_payment_id uuid,
  expected_status public.payment_status,
  transition_reason text default null
)
returns table (payment_id uuid, previous_status public.payment_status, payment_status public.payment_status, paid_at timestamptz, event_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_payment public.payments%rowtype;
  actor_id uuid;
  transition_time timestamptz := clock_timestamp();
  new_event_id uuid;
  normalized_reason text := nullif(btrim(transition_reason), '');
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'ADMIN_PAYMENTS_FORBIDDEN'; end if;
  actor_id := public.current_admin_profile_id();
  if actor_id is null then raise exception using errcode = '42501', message = 'ADMIN_PAYMENTS_FORBIDDEN'; end if;
  if normalized_reason is not null and char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'PAYMENT_REASON_TOO_LONG';
  end if;
  select source_payment.* into current_payment from public.payments source_payment
  where source_payment.id = target_payment_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_FOUND'; end if;
  if current_payment.status <> expected_status then raise exception using errcode = '40001', message = 'PAYMENT_STATUS_CONFLICT'; end if;
  if current_payment.status not in ('UNPAID', 'PENDING') then
    raise exception using errcode = '22023', message = 'PAYMENT_STATUS_INVALID_TRANSITION';
  end if;
  if current_payment.amount is null then raise exception using errcode = '22023', message = 'PAYMENT_AMOUNT_UNRESOLVED'; end if;
  update public.payments set status = 'PAID', paid_at = transition_time where id = current_payment.id;
  insert into public.payment_status_events (payment_id, from_status, to_status, actor_admin_id, reason, created_at)
  values (current_payment.id, current_payment.status, 'PAID', actor_id, normalized_reason, transition_time)
  returning id into new_event_id;
  return query select current_payment.id, current_payment.status, 'PAID'::public.payment_status, transition_time, new_event_id;
end;
$$;
revoke all on function public.admin_mark_payment_paid(uuid, public.payment_status, text) from public, anon, authenticated;
grant execute on function public.admin_mark_payment_paid(uuid, public.payment_status, text) to authenticated;

create or replace function public.admin_transition_delivery_status(
  target_delivery_id uuid,
  expected_status public.delivery_status,
  next_status public.delivery_status,
  transition_reason text default null
)
returns table (delivery_id uuid, previous_status public.delivery_status, delivery_status public.delivery_status, changed_at timestamptz, event_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_delivery public.deliveries%rowtype;
  actor_id uuid;
  transition_time timestamptz := clock_timestamp();
  new_event_id uuid;
  allowed boolean := false;
  normalized_reason text := nullif(btrim(transition_reason), '');
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'ADMIN_DELIVERIES_FORBIDDEN'; end if;
  actor_id := public.current_admin_profile_id();
  if actor_id is null then raise exception using errcode = '42501', message = 'ADMIN_DELIVERIES_FORBIDDEN'; end if;
  if normalized_reason is not null and char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'DELIVERY_REASON_TOO_LONG';
  end if;
  select source_delivery.* into current_delivery from public.deliveries source_delivery
  where source_delivery.id = target_delivery_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'DELIVERY_NOT_FOUND'; end if;
  if current_delivery.status <> expected_status then raise exception using errcode = '40001', message = 'DELIVERY_STATUS_CONFLICT'; end if;
  allowed := case current_delivery.status
    when 'PENDING' then next_status in ('SCHEDULED', 'CANCELLED')
    when 'SCHEDULED' then next_status in ('READY_FOR_DISPATCH', 'CANCELLED')
    when 'READY_FOR_DISPATCH' then next_status in ('OUT_FOR_DELIVERY', 'CANCELLED')
    when 'OUT_FOR_DELIVERY' then next_status in ('DELIVERED', 'FAILED')
    when 'FAILED' then next_status in ('SCHEDULED', 'CANCELLED')
    else false
  end;
  if not allowed then raise exception using errcode = '22023', message = 'DELIVERY_STATUS_INVALID_TRANSITION'; end if;
  update public.deliveries set status = next_status where id = current_delivery.id;
  insert into public.delivery_status_events (delivery_id, from_status, to_status, actor_admin_id, reason, created_at)
  values (current_delivery.id, current_delivery.status, next_status, actor_id, normalized_reason, transition_time)
  returning id into new_event_id;
  return query select current_delivery.id, current_delivery.status, next_status, transition_time, new_event_id;
end;
$$;
revoke all on function public.admin_transition_delivery_status(uuid, public.delivery_status, public.delivery_status, text) from public, anon, authenticated;
grant execute on function public.admin_transition_delivery_status(uuid, public.delivery_status, public.delivery_status, text) to authenticated;

create or replace function public.admin_list_orders(
  search_query text default null,
  status_filter public.order_status default null,
  payment_status_filter public.payment_status default null,
  delivery_date_from date default null,
  delivery_date_to date default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  order_id uuid, order_number text, placed_at timestamptz, order_status public.order_status,
  buyer_name text, buyer_phone text, recipient_name text, recipient_phone text,
  requested_date date, subtotal_amount bigint, payment_method public.payment_method,
  payment_status public.payment_status, item_count bigint, item_summary text, total_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare normalized_search text := nullif(btrim(search_query), '');
begin
  if not public.is_admin() then raise exception using errcode = '42501', message = 'ADMIN_ORDERS_FORBIDDEN'; end if;
  if page_size is null or page_size < 1 or page_size > 50 then raise exception using errcode = '22023', message = 'ADMIN_ORDERS_INVALID_PAGE_SIZE'; end if;
  if page_offset is null or page_offset < 0 or page_offset > 100000 then raise exception using errcode = '22023', message = 'ADMIN_ORDERS_INVALID_PAGE_OFFSET'; end if;
  if normalized_search is not null and char_length(normalized_search) > 120 then raise exception using errcode = '22023', message = 'ADMIN_ORDERS_SEARCH_TOO_LONG'; end if;
  if delivery_date_from is not null and delivery_date_to is not null and delivery_date_from > delivery_date_to then
    raise exception using errcode = '22023', message = 'ADMIN_ORDERS_INVALID_DATE_RANGE';
  end if;
  return query
  with filtered as (
    select source_order.id, source_order.order_number, source_order.placed_at, source_order.status,
      source_order.buyer_name, source_order.buyer_phone, recipient.name recipient_name,
      recipient.phone recipient_phone, source_order.requested_fulfillment_date requested_date,
      coalesce(source_order.total_amount, source_order.subtotal_amount) subtotal_amount,
      payment.method payment_method, payment.status payment_status
    from public.orders source_order
    join public.order_recipients recipient on recipient.order_id = source_order.id
    join public.payments payment on payment.order_id = source_order.id
    where (status_filter is null or source_order.status = status_filter)
      and (payment_status_filter is null or payment.status = payment_status_filter)
      and (delivery_date_from is null or source_order.requested_fulfillment_date >= delivery_date_from)
      and (delivery_date_to is null or source_order.requested_fulfillment_date <= delivery_date_to)
      and (normalized_search is null or source_order.order_number ilike '%' || normalized_search || '%'
        or source_order.buyer_name ilike '%' || normalized_search || '%'
        or source_order.buyer_phone ilike '%' || normalized_search || '%'
        or recipient.name ilike '%' || normalized_search || '%'
        or recipient.phone ilike '%' || normalized_search || '%')
  ), counted as (select filtered.*, count(*) over () total_count from filtered)
  select counted.id, counted.order_number, counted.placed_at, counted.status,
    counted.buyer_name, counted.buyer_phone, counted.recipient_name, counted.recipient_phone,
    counted.requested_date, counted.subtotal_amount, counted.payment_method, counted.payment_status,
    summary.item_count, summary.item_summary, counted.total_count
  from counted
  cross join lateral (
    select count(*) item_count,
      string_agg(item.product_name_snapshot || ' × ' || item.quantity::text, ' · ' order by item.created_at, item.id) item_summary
    from public.order_items item where item.order_id = counted.id
  ) summary
  order by counted.placed_at desc, counted.id desc limit page_size offset page_offset;
end;
$$;

comment on table public.delivery_settings is 'Singleton operational fulfillment configuration managed by Admin.';
comment on table public.payment_settings is 'Protected singleton payment configuration. Only safe snapshots leave the trusted checkout boundary.';
comment on column public.orders.delivery_fee_amount is 'Authoritative VND delivery fee snapshotted when a Step 14 order is created; legacy Step 12 orders remain null.';
comment on column public.orders.total_amount is 'Authoritative subtotal plus delivery fee for Step 14 orders; legacy Step 12 orders remain null.';
