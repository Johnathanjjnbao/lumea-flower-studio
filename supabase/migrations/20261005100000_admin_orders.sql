-- Step 13: least-privilege Admin order reading and guarded status transitions.

create index if not exists orders_status_placed_at_idx
  on public.orders (status, placed_at desc, id);

grant select (
  id, order_number, locale, status, fulfillment_type,
  buyer_name, buyer_phone, buyer_email, buyer_is_recipient, is_surprise,
  card_message, currency, subtotal_amount, delivery_fee_amount, total_amount,
  placed_at, created_at, updated_at
) on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_recipients to authenticated;
grant select on table public.order_addresses to authenticated;
grant select on table public.deliveries to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.order_status_events to authenticated;

create policy orders_admin_read
on public.orders for select
to authenticated
using (public.is_admin());

create policy order_items_admin_read
on public.order_items for select
to authenticated
using (public.is_admin());

create policy order_recipients_admin_read
on public.order_recipients for select
to authenticated
using (public.is_admin());

create policy order_addresses_admin_read
on public.order_addresses for select
to authenticated
using (public.is_admin());

create policy deliveries_admin_read
on public.deliveries for select
to authenticated
using (public.is_admin());

create policy payments_admin_read
on public.payments for select
to authenticated
using (public.is_admin());

create policy order_status_events_admin_read
on public.order_status_events for select
to authenticated
using (public.is_admin());

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
  order_id uuid,
  order_number text,
  placed_at timestamptz,
  order_status public.order_status,
  buyer_name text,
  buyer_phone text,
  recipient_name text,
  recipient_phone text,
  requested_date date,
  subtotal_amount bigint,
  payment_method public.payment_method,
  payment_status public.payment_status,
  item_count bigint,
  item_summary text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text := nullif(btrim(search_query), '');
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_ORDERS_FORBIDDEN';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'ADMIN_ORDERS_INVALID_PAGE_SIZE';
  end if;
  if page_offset is null or page_offset < 0 or page_offset > 100000 then
    raise exception using errcode = '22023', message = 'ADMIN_ORDERS_INVALID_PAGE_OFFSET';
  end if;
  if normalized_search is not null and char_length(normalized_search) > 120 then
    raise exception using errcode = '22023', message = 'ADMIN_ORDERS_SEARCH_TOO_LONG';
  end if;
  if delivery_date_from is not null and delivery_date_to is not null
    and delivery_date_from > delivery_date_to then
    raise exception using errcode = '22023', message = 'ADMIN_ORDERS_INVALID_DATE_RANGE';
  end if;

  return query
  with filtered as (
    select
      source_order.id,
      source_order.order_number,
      source_order.placed_at,
      source_order.status,
      source_order.buyer_name,
      source_order.buyer_phone,
      recipient.name as recipient_name,
      recipient.phone as recipient_phone,
      delivery.requested_date,
      source_order.subtotal_amount,
      payment.method as payment_method,
      payment.status as payment_status
    from public.orders source_order
    join public.order_recipients recipient on recipient.order_id = source_order.id
    join public.deliveries delivery on delivery.order_id = source_order.id
    join public.payments payment on payment.order_id = source_order.id
    where (status_filter is null or source_order.status = status_filter)
      and (payment_status_filter is null or payment.status = payment_status_filter)
      and (delivery_date_from is null or delivery.requested_date >= delivery_date_from)
      and (delivery_date_to is null or delivery.requested_date <= delivery_date_to)
      and (
        normalized_search is null
        or source_order.order_number ilike '%' || normalized_search || '%'
        or source_order.buyer_name ilike '%' || normalized_search || '%'
        or source_order.buyer_phone ilike '%' || normalized_search || '%'
        or recipient.name ilike '%' || normalized_search || '%'
        or recipient.phone ilike '%' || normalized_search || '%'
      )
  ), counted as (
    select filtered.*, count(*) over () as total_count
    from filtered
  )
  select
    counted.id,
    counted.order_number,
    counted.placed_at,
    counted.status,
    counted.buyer_name,
    counted.buyer_phone,
    counted.recipient_name,
    counted.recipient_phone,
    counted.requested_date,
    counted.subtotal_amount,
    counted.payment_method,
    counted.payment_status,
    item_summary.item_count,
    item_summary.item_summary,
    counted.total_count
  from counted
  cross join lateral (
    select
      count(*) as item_count,
      string_agg(
        order_item.product_name_snapshot || ' × ' || order_item.quantity::text,
        ' · ' order by order_item.created_at, order_item.id
      ) as item_summary
    from public.order_items order_item
    where order_item.order_id = counted.id
  ) item_summary
  order by counted.placed_at desc, counted.id desc
  limit page_size
  offset page_offset;
end;
$$;

comment on function public.admin_list_orders(text, public.order_status, public.payment_status, date, date, integer, integer)
  is 'Lists bounded order summaries for an active ADMIN. Never available to anonymous shoppers.';

revoke all on function public.admin_list_orders(text, public.order_status, public.payment_status, date, date, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_orders(text, public.order_status, public.payment_status, date, date, integer, integer)
  to authenticated;

create or replace function public.admin_transition_order_status(
  target_order_id uuid,
  expected_status public.order_status,
  next_status public.order_status,
  transition_reason text default null
)
returns table (
  order_id uuid,
  order_number text,
  previous_status public.order_status,
  order_status public.order_status,
  changed_at timestamptz,
  event_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders%rowtype;
  actor_id uuid;
  normalized_reason text := nullif(btrim(transition_reason), '');
  new_event_id uuid;
  transition_time timestamptz := clock_timestamp();
  transition_allowed boolean := false;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_ORDERS_FORBIDDEN';
  end if;
  if target_order_id is null or expected_status is null or next_status is null then
    raise exception using errcode = '22023', message = 'ORDER_STATUS_INVALID_REQUEST';
  end if;
  if normalized_reason is not null and char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'ORDER_STATUS_REASON_TOO_LONG';
  end if;

  actor_id := public.current_admin_profile_id();
  if actor_id is null then
    raise exception using errcode = '42501', message = 'ADMIN_ORDERS_FORBIDDEN';
  end if;

  select source_order.* into current_order
  from public.orders source_order
  where source_order.id = target_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ORDER_NOT_FOUND';
  end if;
  if current_order.status <> expected_status then
    raise exception using errcode = '40001', message = 'ORDER_STATUS_CONFLICT';
  end if;

  transition_allowed := case current_order.status
    when 'PENDING' then next_status in ('CONFIRMED', 'CANCELLED')
    when 'CONFIRMED' then next_status = 'PREPARING'
    when 'PREPARING' then next_status = 'READY'
    when 'READY' then next_status in ('FULFILLING', 'COMPLETED')
    when 'FULFILLING' then next_status = 'COMPLETED'
    else false
  end;

  if not transition_allowed then
    raise exception using errcode = '22023', message = 'ORDER_STATUS_INVALID_TRANSITION';
  end if;

  update public.orders
  set status = next_status,
      updated_at = transition_time
  where id = current_order.id;

  insert into public.order_status_events (
    order_id, from_status, to_status, actor_admin_id, reason, created_at
  ) values (
    current_order.id, current_order.status, next_status, actor_id, normalized_reason, transition_time
  ) returning id into new_event_id;

  return query select
    current_order.id,
    current_order.order_number,
    current_order.status,
    next_status,
    transition_time,
    new_event_id;
end;
$$;

comment on function public.admin_transition_order_status(uuid, public.order_status, public.order_status, text)
  is 'Atomically applies one approved V1 order-status transition and records its ADMIN actor.';

revoke all on function public.admin_transition_order_status(uuid, public.order_status, public.order_status, text)
  from public, anon, authenticated;
grant execute on function public.admin_transition_order_status(uuid, public.order_status, public.order_status, text)
  to authenticated;
