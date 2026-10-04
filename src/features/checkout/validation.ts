import type {
  CheckoutFieldName,
  CheckoutFormValues,
  CheckoutValidationCode,
  CheckoutValidationErrors,
} from "./types";

const PHONE_PATTERN = /^[0-9+(). -]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function businessDateInVietnam(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function checkoutDeliveryDateBounds() {
  const min = businessDateInVietnam();
  return { min, max: addDays(min, 180) };
}

function checkName(value: string): CheckoutValidationCode | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "nameRequired";
  if (trimmed.length > 120) return "nameTooLong";
  return undefined;
}

function checkPhone(value: string): CheckoutValidationCode | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "phoneRequired";
  if (trimmed.length < 6 || trimmed.length > 32 || !PHONE_PATTERN.test(trimmed)) return "phoneInvalid";
  return undefined;
}

export function validateCheckoutField(
  field: CheckoutFieldName,
  values: CheckoutFormValues,
): CheckoutValidationCode | undefined {
  switch (field) {
    case "buyerName": return checkName(values.buyerName);
    case "buyerPhone": return checkPhone(values.buyerPhone);
    case "buyerEmail": {
      const email = values.buyerEmail.trim();
      return email && (email.length > 254 || !EMAIL_PATTERN.test(email)) ? "emailInvalid" : undefined;
    }
    case "recipientName": return values.buyerIsRecipient ? undefined : checkName(values.recipientName);
    case "recipientPhone": return values.buyerIsRecipient ? undefined : checkPhone(values.recipientPhone);
    case "deliveryAddress": {
      const address = values.deliveryAddress.trim();
      if (address.length < 5) return "addressRequired";
      return address.length > 500 ? "addressTooLong" : undefined;
    }
    case "deliveryDate": {
      if (!values.deliveryDate) return "dateRequired";
      const parsedDate = new Date(`${values.deliveryDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.deliveryDate)
        || Number.isNaN(parsedDate.getTime())
        || parsedDate.toISOString().slice(0, 10) !== values.deliveryDate) return "dateInvalid";
      const bounds = checkoutDeliveryDateBounds();
      if (values.deliveryDate < bounds.min) return "datePast";
      return values.deliveryDate > bounds.max ? "dateTooFar" : undefined;
    }
    case "deliveryNotes": return values.deliveryNotes.trim().length > 1000 ? "notesTooLong" : undefined;
    case "cardMessage": return values.cardMessage.trim().length > 500 ? "messageTooLong" : undefined;
    case "paymentMethod": return undefined;
  }
}

export function validateCheckout(values: CheckoutFormValues): CheckoutValidationErrors {
  const fields: CheckoutFieldName[] = [
    "buyerName",
    "buyerPhone",
    "buyerEmail",
    "recipientName",
    "recipientPhone",
    "deliveryAddress",
    "deliveryDate",
    "deliveryNotes",
    "cardMessage",
    "paymentMethod",
  ];
  return Object.fromEntries(fields.flatMap((field) => {
    const issue = validateCheckoutField(field, values);
    return issue ? [[field, issue]] : [];
  }));
}

export function normalizeCheckoutForm(values: CheckoutFormValues): CheckoutFormValues {
  const buyerName = values.buyerName.trim();
  const buyerPhone = values.buyerPhone.trim();
  return {
    ...values,
    buyerName,
    buyerPhone,
    buyerEmail: values.buyerEmail.trim(),
    recipientName: values.buyerIsRecipient ? buyerName : values.recipientName.trim(),
    recipientPhone: values.buyerIsRecipient ? buyerPhone : values.recipientPhone.trim(),
    isSurprise: values.buyerIsRecipient ? false : values.isSurprise,
    deliveryAddress: values.deliveryAddress.trim(),
    deliveryNotes: values.deliveryNotes.trim(),
    cardMessage: values.cardMessage.trim(),
  };
}

export function firstInvalidField(errors: CheckoutValidationErrors): CheckoutFieldName | null {
  return (Object.keys(errors)[0] as CheckoutFieldName | undefined) ?? null;
}
