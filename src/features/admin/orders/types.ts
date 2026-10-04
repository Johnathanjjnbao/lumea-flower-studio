import type { Database, Json, Tables } from "../../../types/database.generated";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type NextOrderStatus = Exclude<OrderStatus, "PENDING">;
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

export interface AdminOrderFilters {
  search: string;
  status: OrderStatus | "ALL";
  paymentStatus: PaymentStatus | "ALL";
  deliveryFrom: string;
  deliveryTo: string;
  page: number;
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  buyerName: string;
  buyerPhone: string;
  recipientName: string;
  recipientPhone: string;
  requestedDate: string;
  subtotalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemCount: number;
  itemSummary: string;
}

export interface AdminOrderPage {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BouquetFlowerSnapshot {
  flowerId: string;
  flowerCode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BouquetWrappingSnapshot {
  typeId: string;
  typeCode: string;
  typeName: string;
  variantId: string;
  variantCode: string;
  variantName: string;
  swatch: string | null;
  price: number;
}

export interface CustomBouquetSnapshot {
  flowers: BouquetFlowerSnapshot[];
  totalStems: number;
  wrapping: BouquetWrappingSnapshot;
}

export interface AdminOrderItem extends Tables<"order_items"> {
  bouquet: CustomBouquetSnapshot | null;
}

export interface AdminOrderStatusEvent extends Tables<"order_status_events"> {
  actorName: string | null;
}

export type AdminOrderRecord = Pick<Tables<"orders">,
  | "id" | "order_number" | "locale" | "status" | "fulfillment_type"
  | "buyer_name" | "buyer_phone" | "buyer_email" | "buyer_is_recipient" | "is_surprise"
  | "card_message" | "currency" | "subtotal_amount" | "delivery_fee_amount" | "total_amount"
  | "placed_at" | "created_at" | "updated_at"
> & {
  requested_fulfillment_date: string;
  delivery_zone_name_snapshot: string | null;
  delivery_area_name_snapshot: string | null;
  delivery_window_label_snapshot: string | null;
  pickup_name_snapshot: string | null;
  pickup_address_snapshot: string | null;
  pickup_hours_snapshot: string | null;
};

export type AdminPaymentRecord = Tables<"payments"> & {
  payment_reference: string | null;
  bank_name_snapshot: string | null;
  account_number_snapshot: string | null;
  account_holder_snapshot: string | null;
  instruction_snapshot: string | null;
  payment_deadline_at: string | null;
  paid_at: string | null;
};

export interface AdminPaymentStatusEvent {
  id: string;
  from_status: PaymentStatus | null;
  to_status: PaymentStatus;
  actor_admin_id: string | null;
  reason: string | null;
  created_at: string;
  actorName: string | null;
}

export interface AdminDeliveryStatusEvent {
  id: string;
  from_status: DeliveryStatus | null;
  to_status: DeliveryStatus;
  actor_admin_id: string | null;
  reason: string | null;
  created_at: string;
  actorName: string | null;
}

export interface AdminOrderDetail {
  order: AdminOrderRecord;
  items: AdminOrderItem[];
  recipient: Tables<"order_recipients">;
  address: Tables<"order_addresses"> | null;
  delivery: Tables<"deliveries"> | null;
  payment: AdminPaymentRecord;
  events: AdminOrderStatusEvent[];
  paymentEvents: AdminPaymentStatusEvent[];
  deliveryEvents: AdminDeliveryStatusEvent[];
}

export interface PaymentTransitionResult {
  paymentId: string;
  previousStatus: PaymentStatus;
  status: PaymentStatus;
  paidAt: string;
  eventId: string;
}

export interface DeliveryTransitionResult {
  deliveryId: string;
  previousStatus: DeliveryStatus;
  status: DeliveryStatus;
  changedAt: string;
  eventId: string;
}

export interface StatusTransitionResult {
  orderId: string;
  orderNumber: string;
  previousStatus: OrderStatus;
  status: OrderStatus;
  changedAt: string;
  eventId: string;
}

export type OrderConfigurationJson = Json | null;
