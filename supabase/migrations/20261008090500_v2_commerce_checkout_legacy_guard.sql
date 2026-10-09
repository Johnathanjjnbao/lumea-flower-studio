-- Luméa V2.1 production gate: an idempotent retry of a V1 Order must not
-- fabricate an SKU snapshot that was not captured when that Order was placed.

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
      and order_item.sku_snapshot is null
      and not created.was_duplicate;

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
  'V2.1 gateway-only order creation. Validates active SKU/Product/Category, delegates V1.5 authoritative pricing/idempotency, snapshots SKU for new Orders, and preserves legacy NULL snapshots.';

revoke all on function public.create_checkout_order(jsonb, uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb, uuid, bigint)
  to service_role;
