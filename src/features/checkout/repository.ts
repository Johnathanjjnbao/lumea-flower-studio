import { requirePublicSupabaseClient } from "../../lib/supabase";
import type { Json } from "../../types/database.generated";
import { getCheckoutIdempotencyKey } from "./attempt";
import { isOrderReceipt } from "./receipt";
import type { CheckoutOrderRequest, OrderReceipt } from "./types";

export type CheckoutOrderErrorCode =
  | "REVIEW_CHANGED"
  | "ITEM_UNAVAILABLE"
  | "FULFILLMENT_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_REQUEST"
  | "NETWORK";

export class CheckoutOrderError extends Error {
  constructor(public readonly code: CheckoutOrderErrorCode, message: string) {
    super(message);
    this.name = "CheckoutOrderError";
  }
}

interface CheckoutRpcRow {
  order_id: string;
  order_number: string;
  subtotal_amount: number;
  delivery_fee_amount: number;
  total_amount: number;
  order_status: "PENDING";
  payment_status: "UNPAID";
  payment_method: "BANK_TRANSFER" | "CASH";
  fulfillment_type: "DELIVERY" | "PICKUP";
  fulfillment_name: string | null;
  delivery_area_name: string | null;
  delivery_window_label: string | null;
  payment_reference: string | null;
  bank_id: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  vietqr_template: string | null;
  payment_instruction: string | null;
  payment_deadline_at: string | null;
  placed_at: string;
  was_duplicate: boolean;
}

function classifyError(message: string): CheckoutOrderErrorCode {
  if (message.includes("CHECKOUT_REVIEW_CHANGED") || message.includes("CHECKOUT_DELIVERY_REVIEW_CHANGED")) return "REVIEW_CHANGED";
  if (message.includes("CHECKOUT_CONFIGURATION_UNAVAILABLE")
    || message.includes("CHECKOUT_PAYMENT_METHOD_UNAVAILABLE")
    || message.includes("CHECKOUT_DELIVERY_UNAVAILABLE")
    || message.includes("CHECKOUT_DELIVERY_AREA_UNAVAILABLE")
    || message.includes("CHECKOUT_DELIVERY_WINDOW_UNAVAILABLE")
    || message.includes("CHECKOUT_SAME_DAY_UNAVAILABLE")
    || message.includes("CHECKOUT_PICKUP_UNAVAILABLE")) return "FULFILLMENT_UNAVAILABLE";
  if (message.includes("UNAVAILABLE") || message.includes("TONE_REQUIRED")) return "ITEM_UNAVAILABLE";
  if (message.includes("CHECKOUT_IDEMPOTENCY_REUSED")) return "IDEMPOTENCY_CONFLICT";
  if (message.includes("CHECKOUT_") || message.includes("invalid input syntax")) return "INVALID_REQUEST";
  return "NETWORK";
}

function parseRpcRow(value: unknown): CheckoutRpcRow {
  if (!value || typeof value !== "object") throw new CheckoutOrderError("NETWORK", "CHECKOUT_RESPONSE_INVALID");
  const row = value as Partial<CheckoutRpcRow>;
  if (
    typeof row.order_id !== "string"
    || typeof row.order_number !== "string"
    || !Number.isSafeInteger(row.subtotal_amount)
    || row.order_status !== "PENDING"
    || row.payment_status !== "UNPAID"
    || (row.payment_method !== "BANK_TRANSFER" && row.payment_method !== "CASH")
    || (row.fulfillment_type !== "DELIVERY" && row.fulfillment_type !== "PICKUP")
    || !Number.isSafeInteger(row.delivery_fee_amount)
    || !Number.isSafeInteger(row.total_amount)
    || row.total_amount !== Number(row.subtotal_amount) + Number(row.delivery_fee_amount)
    || typeof row.placed_at !== "string"
  ) throw new CheckoutOrderError("NETWORK", "CHECKOUT_RESPONSE_INVALID");
  return row as CheckoutRpcRow;
}

export async function createCheckoutOrder(request: CheckoutOrderRequest): Promise<OrderReceipt> {
  const idempotencyKey = await getCheckoutIdempotencyKey(request);
  const client = requirePublicSupabaseClient();
  let result: Awaited<ReturnType<typeof client.rpc<"create_checkout_order">>>;
  try {
    result = await client.rpc("create_checkout_order", {
      checkout_payload: request.payload as unknown as Json,
      checkout_idempotency_key: idempotencyKey,
      reviewed_subtotal: request.reviewedSubtotal,
    });
  } catch (error) {
    throw new CheckoutOrderError("NETWORK", error instanceof Error ? error.message : "CHECKOUT_NETWORK_ERROR");
  }
  if (result.error) throw new CheckoutOrderError(classifyError(result.error.message), result.error.message);
  const rows = Array.isArray(result.data) ? result.data : [];
  const row = parseRpcRow(rows[0]);
  const receipt: OrderReceipt = {
    version: 2,
    orderId: row.order_id,
    orderNumber: row.order_number,
    subtotalAmount: row.subtotal_amount,
    deliveryFeeAmount: row.delivery_fee_amount,
    totalAmount: row.total_amount,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    fulfillmentType: row.fulfillment_type,
    fulfillmentName: row.fulfillment_name,
    deliveryAreaName: row.delivery_area_name,
    deliveryWindowLabel: row.delivery_window_label,
    paymentReference: row.payment_reference,
    bankId: row.bank_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountHolder: row.account_holder,
    vietqrTemplate: row.vietqr_template,
    paymentInstruction: row.payment_instruction,
    paymentDeadlineAt: row.payment_deadline_at,
    placedAt: row.placed_at,
    locale: request.payload.locale,
  };
  if (!isOrderReceipt(receipt)) throw new CheckoutOrderError("NETWORK", "CHECKOUT_RESPONSE_INVALID");
  return receipt;
}
