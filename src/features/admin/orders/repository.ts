import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type { Database } from "../../../types/database.generated";
import { ORDER_PAGE_SIZE, parseCustomBouquetSnapshot } from "./domain";
import type {
  AdminOrderDetail,
  AdminOrderFilters,
  AdminOrderPage,
  OrderStatus,
  StatusTransitionResult,
} from "./types";

const ADMIN_ORDER_SELECT = `
  id, order_number, locale, status, fulfillment_type,
  buyer_name, buyer_phone, buyer_email, buyer_is_recipient, is_surprise,
  card_message, currency, subtotal_amount, delivery_fee_amount, total_amount,
  placed_at, created_at, updated_at
` as const;

function repositoryError(message: string, error: unknown): Error {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
  const detail = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
    ? error.message
    : null;
  return new Error([message, code, detail].filter(Boolean).join(" · "));
}

function required<T>(value: T | null, label: string): T {
  if (value === null) throw new Error(`ORDER_DETAIL_INCOMPLETE:${label}`);
  return value;
}

export interface AdminOrdersRepository {
  listOrders(filters: AdminOrderFilters): Promise<AdminOrderPage>;
  getOrder(orderId: string): Promise<AdminOrderDetail | null>;
  transitionStatus(orderId: string, expected: OrderStatus, next: OrderStatus, reason?: string): Promise<StatusTransitionResult>;
}

export class SupabaseAdminOrdersRepository implements AdminOrdersRepository {
  constructor(private readonly client: SupabaseClient<Database> = requireSupabaseClient()) {}

  async listOrders(filters: AdminOrderFilters): Promise<AdminOrderPage> {
    const offset = Math.max(0, filters.page - 1) * ORDER_PAGE_SIZE;
    const { data, error } = await this.client.rpc("admin_list_orders", {
      search_query: filters.search.trim() || undefined,
      status_filter: filters.status === "ALL" ? undefined : filters.status,
      payment_status_filter: filters.paymentStatus === "ALL" ? undefined : filters.paymentStatus,
      delivery_date_from: filters.deliveryFrom || undefined,
      delivery_date_to: filters.deliveryTo || undefined,
      page_size: ORDER_PAGE_SIZE,
      page_offset: offset,
    });
    if (error) throw repositoryError("Không thể tải danh sách đơn", error);
    const rows = data ?? [];
    return {
      items: rows.map((row) => ({
        id: row.order_id,
        orderNumber: row.order_number,
        placedAt: row.placed_at,
        status: row.order_status,
        buyerName: row.buyer_name,
        buyerPhone: row.buyer_phone,
        recipientName: row.recipient_name,
        recipientPhone: row.recipient_phone,
        requestedDate: row.requested_date,
        subtotalAmount: row.subtotal_amount,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        itemCount: row.item_count,
        itemSummary: row.item_summary,
      })),
      total: rows[0]?.total_count ?? 0,
      page: filters.page,
      pageSize: ORDER_PAGE_SIZE,
    };
  }

  async getOrder(orderId: string): Promise<AdminOrderDetail | null> {
    const orderResult = await this.client.from("orders").select(ADMIN_ORDER_SELECT).eq("id", orderId).maybeSingle();
    if (orderResult.error) throw repositoryError("Không thể tải đơn", orderResult.error);
    if (!orderResult.data) return null;

    const [itemsResult, recipientResult, addressResult, deliveryResult, paymentResult, eventsResult] = await Promise.all([
      this.client.from("order_items").select("*").eq("order_id", orderId).order("created_at").order("id"),
      this.client.from("order_recipients").select("*").eq("order_id", orderId).maybeSingle(),
      this.client.from("order_addresses").select("*").eq("order_id", orderId).maybeSingle(),
      this.client.from("deliveries").select("*").eq("order_id", orderId).maybeSingle(),
      this.client.from("payments").select("*").eq("order_id", orderId).maybeSingle(),
      this.client.from("order_status_events").select("*").eq("order_id", orderId).order("created_at").order("id"),
    ]);

    const firstError = [itemsResult.error, recipientResult.error, addressResult.error, deliveryResult.error, paymentResult.error, eventsResult.error].find(Boolean);
    if (firstError) throw repositoryError("Không thể tải đầy đủ chi tiết đơn", firstError);

    const events = eventsResult.data ?? [];
    const actorIds = [...new Set(events.flatMap((event) => event.actor_admin_id ? [event.actor_admin_id] : []))];
    const actorNames = new Map<string, string | null>();
    if (actorIds.length > 0) {
      const profileResult = await this.client.from("admin_profiles").select("id, display_name").in("id", actorIds);
      if (profileResult.error) throw repositoryError("Không thể tải người thực hiện", profileResult.error);
      profileResult.data?.forEach((profile) => actorNames.set(profile.id, profile.display_name));
    }

    return {
      order: orderResult.data,
      items: (itemsResult.data ?? []).map((item) => ({
        ...item,
        bouquet: item.item_type === "CUSTOM_BOUQUET" ? parseCustomBouquetSnapshot(item.configuration_summary_snapshot) : null,
      })),
      recipient: required(recipientResult.data, "RECIPIENT"),
      address: required(addressResult.data, "ADDRESS"),
      delivery: required(deliveryResult.data, "DELIVERY"),
      payment: required(paymentResult.data, "PAYMENT"),
      events: events.map((event) => ({ ...event, actorName: event.actor_admin_id ? actorNames.get(event.actor_admin_id) ?? null : null })),
    };
  }

  async transitionStatus(orderId: string, expected: OrderStatus, next: OrderStatus, reason?: string): Promise<StatusTransitionResult> {
    const { data, error } = await this.client.rpc("admin_transition_order_status", {
      target_order_id: orderId,
      expected_status: expected,
      next_status: next,
      transition_reason: reason?.trim() || undefined,
    });
    if (error) throw repositoryError("Không thể cập nhật trạng thái đơn", error);
    const row = data?.[0];
    if (!row) throw new Error("ORDER_STATUS_EMPTY_RESPONSE");
    return {
      orderId: row.order_id,
      orderNumber: row.order_number,
      previousStatus: row.previous_status,
      status: row.order_status,
      changedAt: row.changed_at,
      eventId: row.event_id,
    };
  }
}

export function createAdminOrdersRepository(): AdminOrdersRepository {
  return new SupabaseAdminOrdersRepository();
}
