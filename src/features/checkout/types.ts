import type { CartLine } from "../cart/types";
import type { Locale } from "../../types/content";

export type CheckoutPaymentMethod = "BANK_TRANSFER" | "CASH";
export type CheckoutFulfillmentType = "DELIVERY" | "PICKUP";
export type CheckoutOrderStatus = "PENDING";
export type CheckoutPaymentStatus = "UNPAID";

export interface CheckoutFormValues {
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerIsRecipient: boolean;
  recipientName: string;
  recipientPhone: string;
  isSurprise: boolean;
  fulfillmentType: CheckoutFulfillmentType;
  deliveryAreaId: string;
  deliveryWindowId: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryNotes: string;
  cardMessage: string;
  paymentMethod: CheckoutPaymentMethod;
}

export type CheckoutFieldName = Exclude<keyof CheckoutFormValues, "buyerIsRecipient" | "isSurprise">;

export type CheckoutValidationCode =
  | "nameRequired"
  | "nameTooLong"
  | "phoneRequired"
  | "phoneInvalid"
  | "emailInvalid"
  | "fulfillmentRequired"
  | "areaRequired"
  | "windowRequired"
  | "addressRequired"
  | "addressTooLong"
  | "dateRequired"
  | "dateInvalid"
  | "datePast"
  | "sameDayUnavailable"
  | "dateTooFar"
  | "notesTooLong"
  | "messageTooLong";

export type CheckoutValidationErrors = Partial<Record<CheckoutFieldName, CheckoutValidationCode>>;

export interface CheckoutReadyMadePayloadItem {
  type: "READY_MADE_PRODUCT";
  product_id: string;
  product_code: string;
  variant_id: string;
  variant_code: string;
  tone_code: string | null;
  quantity: number;
}

export interface CheckoutCustomBouquetPayloadItem {
  type: "CUSTOM_BOUQUET";
  quantity: number;
  flowers: Array<{
    flower_id: string;
    flower_code: string;
    quantity: number;
  }>;
  wrapping: {
    type_id: string;
    type_code: string;
    variant_id: string;
    variant_code: string;
  };
}

export type CheckoutPayloadItem = CheckoutReadyMadePayloadItem | CheckoutCustomBouquetPayloadItem;

export interface CheckoutOrderPayload {
  locale: Locale;
  buyer: { name: string; phone: string; email: string | null };
  recipient: {
    name: string;
    phone: string;
    buyer_is_recipient: boolean;
    is_surprise: boolean;
  };
  delivery: {
    fulfillment_type: CheckoutFulfillmentType;
    area_id: string | null;
    window_id: string | null;
    address: string;
    notes: string | null;
    requested_date: string;
  };
  review: { delivery_fee: number; total: number };
  card_message: string | null;
  payment_method: CheckoutPaymentMethod;
  items: CheckoutPayloadItem[];
}

export interface CheckoutOrderRequest {
  payload: CheckoutOrderPayload;
  reviewedSubtotal: number;
}

export interface OrderReceipt {
  version: 1 | 2;
  orderId: string;
  orderNumber: string;
  subtotalAmount: number;
  deliveryFeeAmount: number | null;
  totalAmount: number | null;
  orderStatus: CheckoutOrderStatus;
  paymentStatus: CheckoutPaymentStatus;
  paymentMethod: CheckoutPaymentMethod;
  fulfillmentType: CheckoutFulfillmentType;
  fulfillmentName: string | null;
  deliveryAreaName: string | null;
  deliveryWindowLabel: string | null;
  paymentReference: string | null;
  bankId: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  vietqrTemplate: string | null;
  paymentInstruction: string | null;
  paymentDeadlineAt: string | null;
  placedAt: string;
  locale: Locale;
}

export interface CheckoutDeliveryArea {
  id: string;
  code: string;
  name: string;
}

export interface CheckoutDeliveryZone {
  id: string;
  code: string;
  name: string;
  help: string | null;
  feeAmount: number;
  sameDayEligible: boolean;
  areas: CheckoutDeliveryArea[];
}

export interface CheckoutDeliveryWindow {
  id: string;
  code: string;
  label: string;
  help: string | null;
  startTime: string;
  endTime: string;
  sameDayEligible: boolean;
}

export interface CheckoutOptions {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  sameDayEnabled: boolean;
  sameDayCutoff: string | null;
  deliveryHelp: string | null;
  pickup: { name: string; address: string; hours: string } | null;
  zones: CheckoutDeliveryZone[];
  windows: CheckoutDeliveryWindow[];
  paymentMethods: {
    bankTransfer: boolean;
    cash: boolean;
    cashDelivery: boolean;
    cashPickup: boolean;
  };
}

export interface CheckoutRevalidationResult {
  lines: CartLine[];
  hasChangedPrices: boolean;
  hasUnavailableItems: boolean;
  hasCheckErrors: boolean;
}
