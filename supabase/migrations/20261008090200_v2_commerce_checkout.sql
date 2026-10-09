-- Luméa V2.1: add server-authoritative SKU validation and Order snapshots while
-- preserving the reviewed V1.5 Checkout implementation behind a revoked helper.

alter table public.order_items
  add column sku_snapshot text,
  add constraint order_items_sku_snapshot_format check (
    sku_snapshot is null or sku_snapshot ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
  );

-- Historical V1 rows intentionally remain NULL: the Variant may still exist,
-- but V1 did not snapshot an SKU at purchase time. Filling it now would rewrite
-- historical truth rather than restore captured order data.

create or replace function public.enforce_new_order_item_sku_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_item_type public.order_item_type;
  current_sku text;
begin
  select item.item_type, item.sku_snapshot
    into current_item_type, current_sku
  from public.order_items item
  where item.id = new.id;
  if found and current_item_type = 'READY_MADE_PRODUCT' and current_sku is null then
    raise exception using errcode = '23514', message = 'ORDER_ITEM_SKU_SNAPSHOT_REQUIRED';
  end if;
  return null;
end;
$$;

create constraint trigger order_items_new_sku_snapshot_required
after insert or update on public.order_items
deferrable initially deferred
for each row execute function public.enforce_new_order_item_sku_snapshot();

revoke all on function public.enforce_new_order_item_sku_snapshot() from public;
alter table public.orders
  add column commerce_request_fingerprint text,
  add constraint orders_commerce_request_fingerprint_format check (
    commerce_request_fingerprint is null
    or commerce_request_fingerprint ~ '^[0-9a-f]{32}$'
  );

alter function public.create_checkout_order(jsonb, uuid, bigint)
  rename to create_checkout_order_v15_internal;

revoke all on function public.create_checkout_order_v15_internal(jsonb, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order_v15_internal(jsonb, uuid, bigint)
  to service_role;

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
  cart_item jsonb;
  legacy_items jsonb := '[]'::jsonb;
  legacy_payload jsonb;
  resolved_variant_id uuid;
  existing_key boolean;
  existing_contract_fingerprint text;
  full_contract_fingerprint text;
  created record;
begin
  if checkout_idempotency_key is null or reviewed_subtotal is null or reviewed_subtotal < 0 then
    raise exception using errcode = '22023', message = 'CHECKOUT_REQUEST_INVALID';
  end if;
  if checkout_payload is null or jsonb_typeof(checkout_payload) <> 'object'
    or jsonb_typeof(checkout_payload->'items') <> 'array' then
    raise exception using errcode = '22023', message = 'CHECKOUT_PAYLOAD_INVALID';
  end if;

  for cart_item in select value from jsonb_array_elements(checkout_payload->'items')
  loop
    if cart_item->>'type' = 'READY_MADE_PRODUCT' then
      if not (cart_item ? 'sku')
        or jsonb_typeof(cart_item->'sku') <> 'string'
        or cart_item->>'sku' !~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$' then
        raise exception using errcode = '22023', message = 'CHECKOUT_SKU_INVALID';
      end if;

      legacy_items := legacy_items || jsonb_build_array(cart_item - 'sku');
    else
      legacy_items := legacy_items || jsonb_build_array(cart_item);
    end if;
  end loop;

  legacy_payload := jsonb_set(checkout_payload, '{items}', legacy_items);
  full_contract_fingerprint := md5(checkout_payload::text || ':' || reviewed_subtotal::text);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(checkout_idempotency_key::text, 0));
  select exists (
    select 1 from public.orders source_order
    where source_order.idempotency_key_hash = md5(checkout_idempotency_key::text)
  ) into existing_key;

  if existing_key then
    select source_order.commerce_request_fingerprint into existing_contract_fingerprint
    from public.orders source_order
    where source_order.idempotency_key_hash = md5(checkout_idempotency_key::text);
    if existing_contract_fingerprint is not null
      and existing_contract_fingerprint <> full_contract_fingerprint then
      raise exception using errcode = '22023', message = 'CHECKOUT_IDEMPOTENCY_REUSED';
    end if;
  end if;

  -- Durable retries must return the original Order even if catalog availability
  -- changes after the successful write. The legacy implementation performs the
  -- request-fingerprint comparison before returning that immutable snapshot.
  if not existing_key then
    for cart_item in select value from jsonb_array_elements(checkout_payload->'items')
    loop
      if cart_item->>'type' = 'READY_MADE_PRODUCT' then
        resolved_variant_id := null;
        select variant.id into resolved_variant_id
        from public.product_variants variant
        join public.products product on product.id = variant.product_id
        join public.categories category on category.id = product.category_id
        where variant.id::text = cart_item->>'variant_id'
          and variant.stable_code = cart_item->>'variant_code'
          and variant.sku = cart_item->>'sku'
          and variant.active
          and product.id::text = cart_item->>'product_id'
          and product.stable_code = cart_item->>'product_code'
          and product.product_type in ('READY_MADE_BOUQUET', 'FLORIST_CHOICE')
          and product.visibility = 'PUBLISHED'
          and product.archived_at is null
          and product.availability = 'AVAILABLE'
          and category.visibility = 'PUBLISHED'
          and category.archived_at is null;
        if resolved_variant_id is null then
          raise exception using errcode = 'P0001', message = 'CHECKOUT_SKU_UNAVAILABLE';
        end if;
      end if;
    end loop;
  end if;

  for created in
    select * from public.create_checkout_order_v15_internal(
      legacy_payload,
      checkout_idempotency_key,
      reviewed_subtotal
    )
  loop
    update public.order_items order_item
    set sku_snapshot = variant.sku
    from public.product_variants variant
    where order_item.order_id = created.order_id
      and order_item.item_type = 'READY_MADE_PRODUCT'
      and order_item.source_variant_id = variant.id
      and order_item.sku_snapshot is null;

    update public.orders source_order
    set commerce_request_fingerprint = full_contract_fingerprint
    where source_order.id = created.order_id
      and source_order.commerce_request_fingerprint is null
      and not created.was_duplicate;

    return query select
      created.order_id,
      created.order_number,
      created.subtotal_amount,
      created.delivery_fee_amount,
      created.total_amount,
      created.order_status,
      created.payment_status,
      created.payment_method,
      created.fulfillment_type,
      created.fulfillment_name,
      created.delivery_area_name,
      created.delivery_window_label,
      created.payment_reference,
      created.bank_id,
      created.bank_name,
      created.account_number,
      created.account_holder,
      created.vietqr_template,
      created.payment_instruction,
      created.payment_deadline_at,
      created.placed_at,
      created.was_duplicate;
  end loop;
end;
$$;

comment on function public.create_checkout_order(jsonb, uuid, bigint) is
  'V2.1 gateway-only order creation. Validates active SKU/Product/Category, delegates V1.5 authoritative pricing/idempotency, and snapshots SKU.';

revoke all on function public.create_checkout_order(jsonb, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb, uuid, bigint)
  to service_role;
