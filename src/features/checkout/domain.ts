import type { CartLine } from "../cart/types";
import type { Locale } from "../../types/content";
import type { CheckoutFormValues, CheckoutOrderPayload, CheckoutPayloadItem, CheckoutRevalidationResult } from "./types";
import { normalizeCheckoutForm } from "./validation";

export function inspectCheckoutLines(lines: readonly CartLine[]): CheckoutRevalidationResult {
  return {
    lines: [...lines],
    hasChangedPrices: lines.some((line) => line.validation.state === "changed"),
    hasUnavailableItems: lines.some((line) => line.validation.state === "unavailable"),
    hasCheckErrors: lines.some((line) => line.validation.state === "error" || line.validation.state === "checking" || line.validation.state === "unchecked"),
  };
}

export function checkoutSubtotal(lines: readonly CartLine[]) {
  return lines.reduce((total, line) => {
    const included = line.validation.state === "valid" || line.validation.state === "changed";
    return included ? total + line.unitPriceSnapshot * line.quantity : total;
  }, 0);
}

export function mapCartLineToCheckoutItem(line: CartLine): CheckoutPayloadItem {
  if (line.type === "READY_MADE_PRODUCT") {
    return {
      type: line.type,
      product_id: line.productId,
      product_code: line.productCode,
      variant_id: line.variantId,
      variant_code: line.variantCode,
      tone_code: line.toneCode,
      quantity: line.quantity,
    };
  }
  return {
    type: line.type,
    quantity: line.quantity,
    flowers: line.flowers.map((flower) => ({
      flower_id: flower.flowerId,
      flower_code: flower.flowerCode,
      quantity: flower.quantity,
    })),
    wrapping: {
      type_id: line.wrapping.typeId,
      type_code: line.wrapping.typeCode,
      variant_id: line.wrapping.variantId,
      variant_code: line.wrapping.variantCode,
    },
  };
}

export function createCheckoutPayload(
  values: CheckoutFormValues,
  lines: readonly CartLine[],
  locale: Locale,
  reviewedDeliveryFee: number,
): CheckoutOrderPayload {
  if (lines.length === 0) throw new Error("CHECKOUT_CART_EMPTY");
  const status = inspectCheckoutLines(lines);
  if (status.hasUnavailableItems || status.hasCheckErrors) throw new Error("CHECKOUT_CART_INVALID");
  const normalized = normalizeCheckoutForm(values);
  return {
    locale,
    buyer: {
      name: normalized.buyerName,
      phone: normalized.buyerPhone,
      email: normalized.buyerEmail || null,
    },
    recipient: {
      name: normalized.recipientName,
      phone: normalized.recipientPhone,
      buyer_is_recipient: normalized.buyerIsRecipient,
      is_surprise: normalized.isSurprise,
    },
    delivery: {
      fulfillment_type: normalized.fulfillmentType,
      area_id: normalized.fulfillmentType === "DELIVERY" ? normalized.deliveryAreaId : null,
      window_id: normalized.fulfillmentType === "DELIVERY" ? normalized.deliveryWindowId : null,
      address: normalized.deliveryAddress,
      notes: normalized.deliveryNotes || null,
      requested_date: normalized.deliveryDate,
    },
    review: { delivery_fee: reviewedDeliveryFee, total: checkoutSubtotal(lines) + reviewedDeliveryFee },
    card_message: normalized.cardMessage || null,
    payment_method: normalized.paymentMethod,
    items: lines.map(mapCartLineToCheckoutItem),
  };
}
