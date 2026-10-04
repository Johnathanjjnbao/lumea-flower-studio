-- Step 12: guest checkout and atomic, server-authoritative order creation.

create type public.order_item_type as enum ('READY_MADE_PRODUCT', 'CUSTOM_BOUQUET');
create type public.order_status as enum (
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'FULFILLING', 'COMPLETED', 'CANCELLED'
);
create type public.payment_status as enum ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
create type public.payment_method as enum ('BANK_TRANSFER', 'CASH');
create type public.fulfillment_type as enum ('DELIVERY', 'PICKUP');
create type public.delivery_status as enum (
  'PENDING', 'SCHEDULED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  locale public.locale_code not null,
  status public.order_status not null default 'PENDING',
  fulfillment_type public.fulfillment_type not null default 'DELIVERY',
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text,
  buyer_is_recipient boolean not null,
  is_surprise boolean not null default false,
  card_message text,
  currency text not null default 'VND',
  subtotal_amount bigint not null,
  delivery_fee_amount bigint,
  total_amount bigint,
  idempotency_key_hash text not null unique,
  request_fingerprint text not null,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_number_format check (order_number ~ '^LUM-[0-9A-F]{16}$'),
  constraint orders_buyer_name_length check (char_length(btrim(buyer_name)) between 1 and 120),
  constraint orders_buyer_phone_length check (char_length(btrim(buyer_phone)) between 6 and 32),
  constraint orders_buyer_email_length check (buyer_email is null or char_length(btrim(buyer_email)) between 3 and 254),
  constraint orders_card_message_length check (card_message is null or char_length(card_message) <= 500),
  constraint orders_currency_vnd check (currency = 'VND'),
  constraint orders_subtotal_nonnegative check (subtotal_amount >= 0),
  constraint orders_delivery_fee_nonnegative check (delivery_fee_amount is null or delivery_fee_amount >= 0),
  constraint orders_total_consistent check (
    (delivery_fee_amount is null and total_amount is null)
    or (
      delivery_fee_amount is not null
      and total_amount is not null
      and total_amount = subtotal_amount + delivery_fee_amount
    )
  ),
  constraint orders_surprise_recipient_consistent check (not (buyer_is_recipient and is_surprise)),
  constraint orders_idempotency_key_hash_format check (idempotency_key_hash ~ '^[0-9a-f]{32}$'),
  constraint orders_request_fingerprint_format check (request_fingerprint ~ '^[0-9a-f]{32}$')
);

comment on column public.orders.delivery_fee_amount is
  'Null until an authoritative delivery-zone rule is approved and applied.';
comment on column public.orders.total_amount is
  'Null while delivery_fee_amount is unresolved; subtotal_amount remains authoritative merchandise value.';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  item_type public.order_item_type not null,
  quantity integer not null,
  unit_price_snapshot bigint not null,
  line_total bigint not null,
  source_product_id uuid references public.products (id) on delete set null,
  source_variant_id uuid references public.product_variants (id) on delete set null,
  source_tone_id uuid references public.tones (id) on delete set null,
  source_wrapping_option_id uuid references public.wrapping_options (id) on delete set null,
  source_wrapping_variant_id uuid references public.wrapping_variants (id) on delete set null,
  product_code_snapshot text,
  product_slug_snapshot text,
  product_name_snapshot text not null,
  variant_code_snapshot text,
  variant_name_snapshot text,
  tone_code_snapshot text,
  tone_name_snapshot text,
  primary_media_path_snapshot text,
  configuration_summary_snapshot jsonb,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_range check (quantity between 1 and 20),
  constraint order_items_unit_price_nonnegative check (unit_price_snapshot >= 0),
  constraint order_items_line_total_consistent check (line_total = unit_price_snapshot * quantity),
  constraint order_items_snapshot_name_not_blank check (char_length(btrim(product_name_snapshot)) > 0),
  constraint order_items_kind_shape check (
    (
      item_type = 'READY_MADE_PRODUCT'
      and source_wrapping_option_id is null
      and source_wrapping_variant_id is null
      and product_code_snapshot is not null
      and product_slug_snapshot is not null
      and variant_code_snapshot is not null
      and variant_name_snapshot is not null
      and configuration_summary_snapshot is null
    )
    or
    (
      item_type = 'CUSTOM_BOUQUET'
      and source_product_id is null
      and source_variant_id is null
      and source_tone_id is null
      and configuration_summary_snapshot is not null
    )
  )
);

create table public.order_recipients (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  constraint order_recipients_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint order_recipients_phone_length check (char_length(btrim(phone)) between 6 and 32)
);

create table public.order_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  address_text text not null,
  created_at timestamptz not null default now(),
  constraint order_addresses_text_length check (char_length(btrim(address_text)) between 5 and 500)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  status public.delivery_status not null default 'PENDING',
  requested_date date not null,
  requested_window text,
  delivery_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliveries_window_length check (requested_window is null or char_length(btrim(requested_window)) between 1 and 120),
  constraint deliveries_notes_length check (delivery_notes is null or char_length(delivery_notes) <= 1000)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  method public.payment_method not null,
  status public.payment_status not null default 'UNPAID',
  amount bigint,
  currency text not null default 'VND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_nonnegative check (amount is null or amount >= 0),
  constraint payments_currency_vnd check (currency = 'VND')
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_admin_id uuid references public.admin_profiles (id) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  constraint order_status_events_reason_length check (reason is null or char_length(reason) <= 500)
);

create index order_items_order_idx on public.order_items (order_id, created_at, id);
create index orders_placed_at_idx on public.orders (placed_at desc, id);
create index deliveries_requested_date_idx on public.deliveries (requested_date, status);
create index order_status_events_order_idx on public.order_status_events (order_id, created_at, id);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger deliveries_set_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_recipients enable row level security;
alter table public.order_addresses enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_events enable row level security;

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.order_recipients from anon, authenticated;
revoke all on table public.order_addresses from anon, authenticated;
revoke all on table public.deliveries from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.order_status_events from anon, authenticated;

create or replace function public.create_checkout_order(
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
  placed_at timestamptz,
  was_duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload_fingerprint text;
  idempotency_key_hash_value text;
  payload_locale public.locale_code;
  payload_payment_method public.payment_method;
  buyer jsonb;
  recipient jsonb;
  delivery jsonb;
  cart_items jsonb;
  cart_item jsonb;
  flower_item jsonb;
  resolved_items jsonb := '[]'::jsonb;
  resolved_flowers jsonb;
  current_item jsonb;
  buyer_name_value text;
  buyer_phone_value text;
  buyer_email_value text;
  recipient_name_value text;
  recipient_phone_value text;
  buyer_is_recipient_value boolean;
  surprise_value boolean;
  delivery_address_value text;
  delivery_notes_value text;
  requested_date_value date;
  card_message_value text;
  item_quantity integer;
  flower_quantity integer;
  flower_total bigint;
  wrapping_total bigint;
  unit_price_value bigint;
  authoritative_subtotal bigint := 0;
  total_stems integer;
  seen_flower_ids uuid[];
  product_id_value uuid;
  product_code_value text;
  product_slug_value text;
  product_name_value text;
  variant_id_value uuid;
  variant_code_value text;
  variant_name_value text;
  tone_id_value uuid;
  tone_code_value text;
  tone_name_value text;
  product_tone_count integer;
  media_path_value text;
  flower_id_value uuid;
  flower_code_value text;
  flower_name_value text;
  flower_price_value integer;
  wrapping_option_id_value uuid;
  wrapping_option_code_value text;
  wrapping_option_name_value text;
  wrapping_variant_id_value uuid;
  wrapping_variant_code_value text;
  wrapping_variant_name_value text;
  wrapping_swatch_value text;
  new_order_id uuid;
  new_order_number text;
  new_placed_at timestamptz;
  existing_order public.orders%rowtype;
  existing_payment public.payments%rowtype;
begin
  if checkout_idempotency_key is null then
    raise exception using errcode = '22023', message = 'CHECKOUT_IDEMPOTENCY_REQUIRED';
  end if;
  if reviewed_subtotal is null or reviewed_subtotal < 0 then
    raise exception using errcode = '22023', message = 'CHECKOUT_REVIEW_TOTAL_INVALID';
  end if;
  if checkout_payload is null or jsonb_typeof(checkout_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYLOAD_INVALID';
  end if;
  if not (checkout_payload ?& array['locale', 'buyer', 'recipient', 'delivery', 'card_message', 'payment_method', 'items'])
    or exists (
      select 1 from jsonb_object_keys(checkout_payload) as payload_key
      where payload_key not in ('locale', 'buyer', 'recipient', 'delivery', 'card_message', 'payment_method', 'items')
    ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYLOAD_FIELDS_INVALID';
  end if;

  -- Serialize concurrent retries for the same UUID before checking the
  -- idempotency record. The transaction-scoped lock is automatically released
  -- on commit/rollback and prevents a unique-constraint race from surfacing to
  -- a shopper while still keeping unrelated checkouts fully concurrent.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(checkout_idempotency_key::text, 0)
  );

  idempotency_key_hash_value := md5(checkout_idempotency_key::text);
  payload_fingerprint := md5(checkout_payload::text || ':' || reviewed_subtotal::text);
  select orders.* into existing_order
  from public.orders
  where orders.idempotency_key_hash = idempotency_key_hash_value;

  if existing_order.id is not null then
    if existing_order.request_fingerprint <> payload_fingerprint then
      raise exception using errcode = '22023', message = 'CHECKOUT_IDEMPOTENCY_REUSED';
    end if;
    select payments.* into existing_payment
    from public.payments
    where payments.order_id = existing_order.id;
    return query select
      existing_order.id,
      existing_order.order_number,
      existing_order.subtotal_amount,
      existing_order.delivery_fee_amount,
      existing_order.total_amount,
      existing_order.status,
      existing_payment.status,
      existing_payment.method,
      existing_order.placed_at,
      true;
    return;
  end if;

  if checkout_payload->>'locale' not in ('vi', 'ko') then
    raise exception using errcode = '22023', message = 'CHECKOUT_LOCALE_INVALID';
  end if;
  payload_locale := (checkout_payload->>'locale')::public.locale_code;

  if checkout_payload->>'payment_method' not in ('BANK_TRANSFER', 'CASH') then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYMENT_METHOD_INVALID';
  end if;
  payload_payment_method := (checkout_payload->>'payment_method')::public.payment_method;

  buyer := checkout_payload->'buyer';
  recipient := checkout_payload->'recipient';
  delivery := checkout_payload->'delivery';
  cart_items := checkout_payload->'items';

  if jsonb_typeof(buyer) <> 'object'
    or not (buyer ?& array['name', 'phone', 'email'])
    or exists (select 1 from jsonb_object_keys(buyer) as buyer_key where buyer_key not in ('name', 'phone', 'email')) then
    raise exception using errcode = '22023', message = 'CHECKOUT_BUYER_INVALID';
  end if;
  if jsonb_typeof(recipient) <> 'object'
    or not (recipient ?& array['name', 'phone', 'buyer_is_recipient', 'is_surprise'])
    or exists (
      select 1 from jsonb_object_keys(recipient) as recipient_key
      where recipient_key not in ('name', 'phone', 'buyer_is_recipient', 'is_surprise')
    ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_RECIPIENT_INVALID';
  end if;
  if jsonb_typeof(delivery) <> 'object'
    or not (delivery ?& array['address', 'notes', 'requested_date'])
    or exists (
      select 1 from jsonb_object_keys(delivery) as delivery_key
      where delivery_key not in ('address', 'notes', 'requested_date')
    ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_INVALID';
  end if;

  buyer_name_value := btrim(buyer->>'name');
  buyer_phone_value := btrim(buyer->>'phone');
  buyer_email_value := nullif(btrim(coalesce(buyer->>'email', '')), '');
  recipient_name_value := btrim(recipient->>'name');
  recipient_phone_value := btrim(recipient->>'phone');
  delivery_address_value := btrim(delivery->>'address');
  delivery_notes_value := nullif(btrim(coalesce(delivery->>'notes', '')), '');
  card_message_value := nullif(btrim(coalesce(checkout_payload->>'card_message', '')), '');

  if jsonb_typeof(buyer->'name') <> 'string'
    or char_length(buyer_name_value) not between 1 and 120
    or jsonb_typeof(buyer->'phone') <> 'string'
    or char_length(buyer_phone_value) not between 6 and 32
    or buyer_phone_value !~ '^[0-9+(). -]+$'
    or (buyer_email_value is not null and (
      jsonb_typeof(buyer->'email') <> 'string'
      or char_length(buyer_email_value) not between 3 and 254
      or buyer_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )) then
    raise exception using errcode = '22023', message = 'CHECKOUT_BUYER_INVALID';
  end if;

  if jsonb_typeof(recipient->'name') <> 'string'
    or char_length(recipient_name_value) not between 1 and 120
    or jsonb_typeof(recipient->'phone') <> 'string'
    or char_length(recipient_phone_value) not between 6 and 32
    or recipient_phone_value !~ '^[0-9+(). -]+$'
    or jsonb_typeof(recipient->'buyer_is_recipient') <> 'boolean'
    or jsonb_typeof(recipient->'is_surprise') <> 'boolean' then
    raise exception using errcode = '22023', message = 'CHECKOUT_RECIPIENT_INVALID';
  end if;
  buyer_is_recipient_value := (recipient->>'buyer_is_recipient')::boolean;
  surprise_value := (recipient->>'is_surprise')::boolean;
  if buyer_is_recipient_value and (
    recipient_name_value <> buyer_name_value
    or recipient_phone_value <> buyer_phone_value
    or surprise_value
  ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_RECIPIENT_CONFLICT';
  end if;

  if jsonb_typeof(delivery->'address') <> 'string'
    or char_length(delivery_address_value) not between 5 and 500
    or (delivery_notes_value is not null and (
      jsonb_typeof(delivery->'notes') <> 'string' or char_length(delivery_notes_value) > 1000
    ))
    or jsonb_typeof(delivery->'requested_date') <> 'string'
    or delivery->>'requested_date' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_INVALID';
  end if;
  begin
    requested_date_value := (delivery->>'requested_date')::date;
  exception when others then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_DATE_INVALID';
  end;
  if requested_date_value < (now() at time zone 'Asia/Ho_Chi_Minh')::date
    or requested_date_value > (now() at time zone 'Asia/Ho_Chi_Minh')::date + 180 then
    raise exception using errcode = '22023', message = 'CHECKOUT_DELIVERY_DATE_INVALID';
  end if;
  if card_message_value is not null and (
    jsonb_typeof(checkout_payload->'card_message') <> 'string' or char_length(card_message_value) > 500
  ) then
    raise exception using errcode = '22023', message = 'CHECKOUT_CARD_MESSAGE_INVALID';
  end if;

  if jsonb_typeof(cart_items) <> 'array' or jsonb_array_length(cart_items) not between 1 and 50 then
    raise exception using errcode = '22023', message = 'CHECKOUT_ITEMS_INVALID';
  end if;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    if jsonb_typeof(cart_item) <> 'object'
      or not (cart_item ?& array['type', 'quantity'])
      or jsonb_typeof(cart_item->'quantity') <> 'number'
      or cart_item->>'quantity' !~ '^\d+$' then
      raise exception using errcode = '22023', message = 'CHECKOUT_ITEM_INVALID';
    end if;
    item_quantity := (cart_item->>'quantity')::integer;
    if item_quantity not between 1 and 20 then
      raise exception using errcode = '22023', message = 'CHECKOUT_QUANTITY_INVALID';
    end if;

    if cart_item->>'type' = 'READY_MADE_PRODUCT' then
      if not (cart_item ?& array['type', 'product_id', 'product_code', 'variant_id', 'variant_code', 'tone_code', 'quantity'])
        or exists (
          select 1 from jsonb_object_keys(cart_item) as item_key
          where item_key not in ('type', 'product_id', 'product_code', 'variant_id', 'variant_code', 'tone_code', 'quantity')
        )
        or jsonb_typeof(cart_item->'product_id') <> 'string'
        or cart_item->>'product_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or jsonb_typeof(cart_item->'variant_id') <> 'string'
        or cart_item->>'variant_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or jsonb_typeof(cart_item->'product_code') <> 'string'
        or jsonb_typeof(cart_item->'variant_code') <> 'string'
        or (cart_item->'tone_code' <> 'null'::jsonb and jsonb_typeof(cart_item->'tone_code') <> 'string') then
        raise exception using errcode = '22023', message = 'CHECKOUT_READY_ITEM_INVALID';
      end if;

      product_id_value := null;
      tone_id_value := null;
      tone_code_value := nullif(cart_item->>'tone_code', '');
      tone_name_value := null;
      media_path_value := null;
      select
        product.id,
        product.stable_code,
        product.slug,
        coalesce(
          (select translation.name from public.product_translations translation where translation.product_id = product.id and translation.locale = payload_locale),
          (select translation.name from public.product_translations translation where translation.product_id = product.id and translation.locale = 'vi'),
          product.stable_code
        ),
        variant.id,
        variant.stable_code,
        coalesce(
          (select translation.name from public.product_variant_translations translation where translation.product_variant_id = variant.id and translation.locale = payload_locale),
          (select translation.name from public.product_variant_translations translation where translation.product_variant_id = variant.id and translation.locale = 'vi'),
          variant.stable_code
        ),
        variant.price_amount::bigint,
        (
          select media.storage_path
          from public.product_images image
          join public.media_assets media on media.id = image.media_asset_id
          where image.product_id = product.id
            and image.role = 'PRIMARY'
            and image.active
            and media.access = 'PUBLIC'
            and media.status = 'ACTIVE'
          order by image.sort_order, image.id
          limit 1
        )
      into
        product_id_value, product_code_value, product_slug_value, product_name_value,
        variant_id_value, variant_code_value, variant_name_value, unit_price_value, media_path_value
      from public.products product
      join public.product_variants variant on variant.product_id = product.id
      where product.id = (cart_item->>'product_id')::uuid
        and product.stable_code = cart_item->>'product_code'
        and product.product_type in ('READY_MADE_BOUQUET', 'FLORIST_CHOICE')
        and product.visibility = 'PUBLISHED'
        and product.archived_at is null
        and product.availability = 'AVAILABLE'
        and variant.id = (cart_item->>'variant_id')::uuid
        and variant.stable_code = cart_item->>'variant_code'
        and variant.active;

      if product_id_value is null then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_READY_ITEM_UNAVAILABLE';
      end if;

      select count(*) into product_tone_count
      from public.product_tones product_tone
      join public.tones tone on tone.id = product_tone.tone_id
      where product_tone.product_id = product_id_value
        and product_tone.active
        and tone.visibility = 'PUBLISHED'
        and tone.archived_at is null;

      if product_tone_count > 0 then
        if tone_code_value is null then
          raise exception using errcode = 'P0001', message = 'CHECKOUT_TONE_REQUIRED';
        end if;
        select
          tone.id,
          tone.stable_code,
          coalesce(
            (select translation.name from public.tone_translations translation where translation.tone_id = tone.id and translation.locale = payload_locale),
            (select translation.name from public.tone_translations translation where translation.tone_id = tone.id and translation.locale = 'vi'),
            tone.stable_code
          )
        into tone_id_value, tone_code_value, tone_name_value
        from public.product_tones product_tone
        join public.tones tone on tone.id = product_tone.tone_id
        where product_tone.product_id = product_id_value
          and product_tone.active
          and tone.visibility = 'PUBLISHED'
          and tone.archived_at is null
          and tone.stable_code = tone_code_value;
        if tone_id_value is null then
          raise exception using errcode = 'P0001', message = 'CHECKOUT_TONE_UNAVAILABLE';
        end if;
      elsif tone_code_value is not null then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_TONE_UNAVAILABLE';
      end if;

      resolved_items := resolved_items || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(),
        'item_type', 'READY_MADE_PRODUCT',
        'quantity', item_quantity,
        'unit_price', unit_price_value,
        'line_total', unit_price_value * item_quantity,
        'source_product_id', product_id_value,
        'source_variant_id', variant_id_value,
        'source_tone_id', tone_id_value,
        'product_code', product_code_value,
        'product_slug', product_slug_value,
        'product_name', product_name_value,
        'variant_code', variant_code_value,
        'variant_name', variant_name_value,
        'tone_code', tone_code_value,
        'tone_name', tone_name_value,
        'media_path', media_path_value
      ));
      authoritative_subtotal := authoritative_subtotal + (unit_price_value * item_quantity);

    elsif cart_item->>'type' = 'CUSTOM_BOUQUET' then
      if not (cart_item ?& array['type', 'quantity', 'flowers', 'wrapping'])
        or exists (
          select 1 from jsonb_object_keys(cart_item) as item_key
          where item_key not in ('type', 'quantity', 'flowers', 'wrapping')
        )
        or jsonb_typeof(cart_item->'flowers') <> 'array'
        or jsonb_array_length(cart_item->'flowers') not between 1 and 50
        or jsonb_typeof(cart_item->'wrapping') <> 'object' then
        raise exception using errcode = '22023', message = 'CHECKOUT_BOUQUET_ITEM_INVALID';
      end if;

      resolved_flowers := '[]'::jsonb;
      seen_flower_ids := '{}'::uuid[];
      flower_total := 0;
      total_stems := 0;
      for flower_item in select value from jsonb_array_elements(cart_item->'flowers')
      loop
        if jsonb_typeof(flower_item) <> 'object'
          or not (flower_item ?& array['flower_id', 'flower_code', 'quantity'])
          or exists (
            select 1 from jsonb_object_keys(flower_item) as flower_key
            where flower_key not in ('flower_id', 'flower_code', 'quantity')
          )
          or jsonb_typeof(flower_item->'flower_id') <> 'string'
          or flower_item->>'flower_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or jsonb_typeof(flower_item->'flower_code') <> 'string'
          or jsonb_typeof(flower_item->'quantity') <> 'number'
          or flower_item->>'quantity' !~ '^\d+$' then
          raise exception using errcode = '22023', message = 'CHECKOUT_BOUQUET_FLOWER_INVALID';
        end if;
        flower_id_value := (flower_item->>'flower_id')::uuid;
        flower_quantity := (flower_item->>'quantity')::integer;
        if flower_quantity not between 1 and 20 or flower_id_value = any(seen_flower_ids) then
          raise exception using errcode = '22023', message = 'CHECKOUT_BOUQUET_FLOWER_INVALID';
        end if;
        seen_flower_ids := array_append(seen_flower_ids, flower_id_value);

        flower_code_value := null;
        select
          flower.stable_code,
          coalesce(
            (select translation.name from public.flower_stem_translations translation where translation.flower_stem_id = flower.id and translation.locale = payload_locale),
            (select translation.name from public.flower_stem_translations translation where translation.flower_stem_id = flower.id and translation.locale = 'vi'),
            flower.stable_code
          ),
          flower.price_per_stem_amount
        into flower_code_value, flower_name_value, flower_price_value
        from public.flower_stems flower
        where flower.id = flower_id_value
          and flower.stable_code = flower_item->>'flower_code'
          and flower.visibility = 'PUBLISHED'
          and flower.archived_at is null
          and flower.availability = 'AVAILABLE';
        if flower_code_value is null then
          raise exception using errcode = 'P0001', message = 'CHECKOUT_BOUQUET_FLOWER_UNAVAILABLE';
        end if;
        total_stems := total_stems + flower_quantity;
        if total_stems > 200 then
          raise exception using errcode = '22023', message = 'CHECKOUT_BOUQUET_TOO_LARGE';
        end if;
        flower_total := flower_total + (flower_price_value::bigint * flower_quantity);
        resolved_flowers := resolved_flowers || jsonb_build_array(jsonb_build_object(
          'flower_id', flower_id_value,
          'flower_code', flower_code_value,
          'name', flower_name_value,
          'quantity', flower_quantity,
          'unit_price', flower_price_value,
          'line_total', flower_price_value::bigint * flower_quantity
        ));
      end loop;

      if not ((cart_item->'wrapping') ?& array['type_id', 'type_code', 'variant_id', 'variant_code'])
        or exists (
          select 1 from jsonb_object_keys(cart_item->'wrapping') as wrapping_key
          where wrapping_key not in ('type_id', 'type_code', 'variant_id', 'variant_code')
        )
        or jsonb_typeof(cart_item->'wrapping'->'type_id') <> 'string'
        or cart_item->'wrapping'->>'type_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or jsonb_typeof(cart_item->'wrapping'->'variant_id') <> 'string'
        or cart_item->'wrapping'->>'variant_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or jsonb_typeof(cart_item->'wrapping'->'type_code') <> 'string'
        or jsonb_typeof(cart_item->'wrapping'->'variant_code') <> 'string' then
        raise exception using errcode = '22023', message = 'CHECKOUT_BOUQUET_WRAPPING_INVALID';
      end if;

      wrapping_option_id_value := null;
      select
        wrapping_option.id,
        wrapping_option.stable_code,
        coalesce(
          (select translation.name from public.wrapping_option_translations translation where translation.wrapping_option_id = wrapping_option.id and translation.locale = payload_locale),
          (select translation.name from public.wrapping_option_translations translation where translation.wrapping_option_id = wrapping_option.id and translation.locale = 'vi'),
          wrapping_option.stable_code
        ),
        wrapping_variant.id,
        wrapping_variant.stable_code,
        coalesce(
          (select translation.name from public.wrapping_variant_translations translation where translation.wrapping_variant_id = wrapping_variant.id and translation.locale = payload_locale),
          (select translation.name from public.wrapping_variant_translations translation where translation.wrapping_variant_id = wrapping_variant.id and translation.locale = 'vi'),
          wrapping_variant.stable_code
        ),
        wrapping_variant.swatch_value,
        (
          wrapping_option.price_modifier_amount
          + wrapping_variant.price_modifier_amount
          + coalesce(compatibility.price_modifier_amount, 0)
        )::bigint
      into
        wrapping_option_id_value, wrapping_option_code_value, wrapping_option_name_value,
        wrapping_variant_id_value, wrapping_variant_code_value, wrapping_variant_name_value,
        wrapping_swatch_value, wrapping_total
      from public.wrapping_options wrapping_option
      join public.wrapping_option_variants compatibility
        on compatibility.wrapping_option_id = wrapping_option.id and compatibility.active
      join public.wrapping_variants wrapping_variant
        on wrapping_variant.id = compatibility.wrapping_variant_id
      where wrapping_option.id = (cart_item->'wrapping'->>'type_id')::uuid
        and wrapping_option.stable_code = cart_item->'wrapping'->>'type_code'
        and wrapping_option.visibility = 'PUBLISHED'
        and wrapping_option.archived_at is null
        and wrapping_variant.id = (cart_item->'wrapping'->>'variant_id')::uuid
        and wrapping_variant.stable_code = cart_item->'wrapping'->>'variant_code'
        and wrapping_variant.visibility = 'PUBLISHED'
        and wrapping_variant.archived_at is null;
      if wrapping_option_id_value is null then
        raise exception using errcode = 'P0001', message = 'CHECKOUT_BOUQUET_WRAPPING_UNAVAILABLE';
      end if;

      unit_price_value := flower_total + wrapping_total;
      resolved_items := resolved_items || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(),
        'item_type', 'CUSTOM_BOUQUET',
        'quantity', item_quantity,
        'unit_price', unit_price_value,
        'line_total', unit_price_value * item_quantity,
        'source_wrapping_option_id', wrapping_option_id_value,
        'source_wrapping_variant_id', wrapping_variant_id_value,
        'product_name', case when payload_locale = 'ko' then '나만의 꽃다발' else 'Bó hoa tự tạo' end,
        'configuration', jsonb_build_object(
          'flowers', resolved_flowers,
          'total_stems', total_stems,
          'wrapping', jsonb_build_object(
            'type_id', wrapping_option_id_value,
            'type_code', wrapping_option_code_value,
            'type_name', wrapping_option_name_value,
            'variant_id', wrapping_variant_id_value,
            'variant_code', wrapping_variant_code_value,
            'variant_name', wrapping_variant_name_value,
            'swatch', wrapping_swatch_value,
            'price', wrapping_total
          )
        )
      ));
      authoritative_subtotal := authoritative_subtotal + (unit_price_value * item_quantity);
    else
      raise exception using errcode = '22023', message = 'CHECKOUT_ITEM_TYPE_INVALID';
    end if;
  end loop;

  if authoritative_subtotal <> reviewed_subtotal then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_REVIEW_CHANGED';
  end if;

  loop
    new_order_number := 'LUM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    exit when not exists (select 1 from public.orders where orders.order_number = new_order_number);
  end loop;
  new_order_id := gen_random_uuid();
  new_placed_at := now();

  insert into public.orders (
    id, order_number, locale, status, fulfillment_type,
    buyer_name, buyer_phone, buyer_email, buyer_is_recipient, is_surprise,
    card_message, currency, subtotal_amount, delivery_fee_amount, total_amount,
    idempotency_key_hash, request_fingerprint, placed_at
  ) values (
    new_order_id, new_order_number, payload_locale, 'PENDING', 'DELIVERY',
    buyer_name_value, buyer_phone_value, buyer_email_value, buyer_is_recipient_value, surprise_value,
    card_message_value, 'VND', authoritative_subtotal, null, null,
    idempotency_key_hash_value, payload_fingerprint, new_placed_at
  );

  insert into public.order_recipients (order_id, name, phone)
  values (new_order_id, recipient_name_value, recipient_phone_value);

  insert into public.order_addresses (order_id, address_text)
  values (new_order_id, delivery_address_value);

  insert into public.deliveries (order_id, status, requested_date, requested_window, delivery_notes)
  values (new_order_id, 'PENDING', requested_date_value, null, delivery_notes_value);

  insert into public.payments (order_id, method, status, amount, currency)
  values (new_order_id, payload_payment_method, 'UNPAID', null, 'VND');

  insert into public.order_status_events (order_id, from_status, to_status, reason)
  values (new_order_id, null, 'PENDING', 'ORDER_PLACED');

  for current_item in select value from jsonb_array_elements(resolved_items)
  loop
    insert into public.order_items (
      id, order_id, item_type, quantity, unit_price_snapshot, line_total,
      source_product_id, source_variant_id, source_tone_id,
      source_wrapping_option_id, source_wrapping_variant_id,
      product_code_snapshot, product_slug_snapshot, product_name_snapshot,
      variant_code_snapshot, variant_name_snapshot, tone_code_snapshot, tone_name_snapshot,
      primary_media_path_snapshot, configuration_summary_snapshot
    ) values (
      (current_item->>'id')::uuid,
      new_order_id,
      (current_item->>'item_type')::public.order_item_type,
      (current_item->>'quantity')::integer,
      (current_item->>'unit_price')::bigint,
      (current_item->>'line_total')::bigint,
      nullif(current_item->>'source_product_id', '')::uuid,
      nullif(current_item->>'source_variant_id', '')::uuid,
      nullif(current_item->>'source_tone_id', '')::uuid,
      nullif(current_item->>'source_wrapping_option_id', '')::uuid,
      nullif(current_item->>'source_wrapping_variant_id', '')::uuid,
      nullif(current_item->>'product_code', ''),
      nullif(current_item->>'product_slug', ''),
      current_item->>'product_name',
      nullif(current_item->>'variant_code', ''),
      nullif(current_item->>'variant_name', ''),
      nullif(current_item->>'tone_code', ''),
      nullif(current_item->>'tone_name', ''),
      nullif(current_item->>'media_path', ''),
      current_item->'configuration'
    );
  end loop;

  return query select
    new_order_id,
    new_order_number,
    authoritative_subtotal,
    null::bigint,
    null::bigint,
    'PENDING'::public.order_status,
    'UNPAID'::public.payment_status,
    payload_payment_method,
    new_placed_at,
    false;
end;
$$;

comment on function public.create_checkout_order(jsonb, uuid, bigint) is
  'Creates one guest Order atomically from stable cart identities. Catalog price, availability, status, and initial business statuses are server-authoritative.';

revoke all on function public.create_checkout_order(jsonb, uuid, bigint) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb, uuid, bigint) to anon, authenticated;
