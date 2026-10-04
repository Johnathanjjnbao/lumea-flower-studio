import type { OrderReceipt } from "./types";

const RECEIPT_STORAGE_KEY = "lumea.order-receipt.v1";
const RECEIPT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PersistedReceipt {
  savedAt: number;
  receipt: OrderReceipt;
}

function storageOrNull() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function isOrderReceipt(value: unknown): value is OrderReceipt {
  if (!value || typeof value !== "object") return false;
  const receipt = value as Partial<OrderReceipt>;
  const subtotal = receipt.subtotalAmount;
  const deliveryFee = receipt.deliveryFeeAmount;
  const total = receipt.totalAmount;
  return receipt.version === 1
    && typeof receipt.orderId === "string"
    && UUID_PATTERN.test(receipt.orderId)
    && typeof receipt.orderNumber === "string"
    && /^LUM-[0-9A-F]{16}$/.test(receipt.orderNumber)
    && typeof subtotal === "number"
    && Number.isSafeInteger(subtotal)
    && subtotal >= 0
    && (deliveryFee === null || (typeof deliveryFee === "number" && Number.isSafeInteger(deliveryFee) && deliveryFee >= 0))
    && (total === null || (typeof total === "number" && Number.isSafeInteger(total) && total >= 0))
    && ((deliveryFee === null && total === null)
      || (typeof deliveryFee === "number" && typeof total === "number" && total === subtotal + deliveryFee))
    && receipt.orderStatus === "PENDING"
    && receipt.paymentStatus === "UNPAID"
    && (receipt.paymentMethod === "BANK_TRANSFER" || receipt.paymentMethod === "CASH")
    && typeof receipt.placedAt === "string"
    && !Number.isNaN(Date.parse(receipt.placedAt))
    && (receipt.locale === "vi" || receipt.locale === "ko");
}

export function writeOrderReceipt(receipt: OrderReceipt) {
  const storage = storageOrNull();
  if (!storage) return false;
  try {
    storage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), receipt } satisfies PersistedReceipt));
    return true;
  } catch { return false; }
}

export function readOrderReceipt(): OrderReceipt | null {
  const storage = storageOrNull();
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(RECEIPT_STORAGE_KEY) ?? "null") as Partial<PersistedReceipt> | null;
    if (!parsed || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > RECEIPT_MAX_AGE_MS || !isOrderReceipt(parsed.receipt)) return null;
    return parsed.receipt;
  } catch { return null; }
}
