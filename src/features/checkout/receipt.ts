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
  const baseValid = (receipt.version === 1 || receipt.version === 2)
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
  if (!baseValid) return false;
  if (receipt.version === 1) return true;
  const fulfillmentValid = receipt.fulfillmentType === "DELIVERY"
    ? typeof receipt.fulfillmentName === "string" && Boolean(receipt.fulfillmentName.trim())
      && typeof receipt.deliveryAreaName === "string" && Boolean(receipt.deliveryAreaName.trim())
      && typeof receipt.deliveryWindowLabel === "string" && Boolean(receipt.deliveryWindowLabel.trim())
    : receipt.fulfillmentType === "PICKUP"
      && typeof receipt.fulfillmentName === "string" && Boolean(receipt.fulfillmentName.trim())
      && receipt.deliveryAreaName === null && receipt.deliveryWindowLabel === null;
  const paymentValid = receipt.paymentMethod === "BANK_TRANSFER"
    ? typeof total === "number" && total <= 9_999_999_999_999
      && typeof receipt.paymentReference === "string" && /^[A-Za-z0-9 ]{1,50}$/.test(receipt.paymentReference)
      && typeof receipt.bankId === "string" && /^[A-Za-z0-9]{2,20}$/.test(receipt.bankId)
      && typeof receipt.bankName === "string" && Boolean(receipt.bankName.trim())
      && typeof receipt.accountNumber === "string" && /^[A-Za-z0-9]{1,19}$/.test(receipt.accountNumber)
      && typeof receipt.accountHolder === "string" && Boolean(receipt.accountHolder.trim())
      && typeof receipt.vietqrTemplate === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(receipt.vietqrTemplate)
      && typeof receipt.paymentInstruction === "string" && Boolean(receipt.paymentInstruction.trim())
    : receipt.paymentReference === null && receipt.bankId === null && receipt.bankName === null
      && receipt.accountNumber === null && receipt.accountHolder === null && receipt.vietqrTemplate === null
      && typeof receipt.paymentInstruction === "string" && Boolean(receipt.paymentInstruction.trim());
  return fulfillmentValid && paymentValid
    && typeof deliveryFee === "number"
    && typeof total === "number"
    && (receipt.paymentDeadlineAt === null || (typeof receipt.paymentDeadlineAt === "string" && !Number.isNaN(Date.parse(receipt.paymentDeadlineAt))));
}

export function vietQrImageUrl(receipt: OrderReceipt) {
  if (receipt.version !== 2 || receipt.paymentMethod !== "BANK_TRANSFER" || receipt.totalAmount === null
    || !receipt.bankId || !receipt.accountNumber || !receipt.accountHolder || !receipt.vietqrTemplate || !receipt.paymentReference) return null;
  const path = [receipt.bankId, receipt.accountNumber, receipt.vietqrTemplate].map(encodeURIComponent).join("-");
  const query = new URLSearchParams({
    amount: String(receipt.totalAmount),
    addInfo: receipt.paymentReference,
    accountName: receipt.accountHolder,
  });
  return `https://img.vietqr.io/image/${path}.png?${query.toString()}`;
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
