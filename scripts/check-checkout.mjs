import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });

try {
  const [{ validateCheckout, validateCheckoutField, normalizeCheckoutForm, businessDateInVietnam }, domain, receiptModule] = await Promise.all([
    vite.ssrLoadModule("/src/features/checkout/validation.ts"),
    vite.ssrLoadModule("/src/features/checkout/domain.ts"),
    vite.ssrLoadModule("/src/features/checkout/receipt.ts"),
  ]);

  const readyLine = {
    id: "ready:product-1:variant-1:pink",
    type: "READY_MADE_PRODUCT",
    quantity: 2,
    unitPriceSnapshot: 120_000_000,
    addedAt: "2026-10-04T00:00:00.000Z",
    productId: "11111111-1111-4111-8111-111111111111",
    productCode: "pink-garden",
    productSlug: "pink-garden",
    variantId: "22222222-2222-4222-8222-222222222222",
    variantCode: "standard",
    toneCode: "pink",
    display: { productName: "Pink Garden", variantName: "Standard", toneName: "Pink", imageUrl: null, imageAlt: "Pink Garden" },
    validation: { state: "valid" },
  };
  const customLine = {
    id: "custom:bouquet-1",
    type: "CUSTOM_BOUQUET",
    quantity: 1,
    unitPriceSnapshot: 335_000,
    addedAt: "2026-10-04T00:00:00.000Z",
    configurationKey: "bouquet-1",
    flowers: [
      { flowerId: "33333333-3333-4333-8333-333333333333", flowerCode: "garden-rose", quantity: 5, name: "Hồng garden", imageUrl: "", imageAlt: "Hồng garden" },
    ],
    wrapping: {
      typeId: "44444444-4444-4444-8444-444444444444", typeCode: "classic-paper", typeName: "Giấy cổ điển",
      variantId: "55555555-5555-4555-8555-555555555555", variantCode: "ivory", variantName: "Ivory", swatch: "#EEE8DE",
    },
    totalStemCount: 5,
    validation: { state: "valid" },
  };
  const baseForm = {
    buyerName: "  Nguyễn An  ", buyerPhone: " 0909 111 222 ", buyerEmail: " an@example.com ",
    buyerIsRecipient: false, recipientName: "Trần Bình", recipientPhone: "+84 909 333 444", isSurprise: true,
    fulfillmentType: "DELIVERY",
    deliveryAreaId: "77777777-7777-4777-8777-777777777777",
    deliveryWindowId: "88888888-8888-4888-8888-888888888888",
    deliveryAddress: "12 Nguyễn Huệ, Quận 1, TP.HCM", deliveryDate: businessDateInVietnam(), deliveryNotes: "Gọi trước",
    cardMessage: "Chúc mừng sinh nhật", paymentMethod: "BANK_TRANSFER",
  };

  assert.deepEqual(validateCheckout(baseForm), {}, "valid checkout data should pass");
  const selfForm = { ...baseForm, buyerIsRecipient: true, recipientName: "", recipientPhone: "", isSurprise: true };
  assert.deepEqual(validateCheckout(selfForm), {}, "buyer-as-recipient should not require duplicate fields");
  const normalizedSelf = normalizeCheckoutForm(selfForm);
  assert.equal(normalizedSelf.recipientName, "Nguyễn An");
  assert.equal(normalizedSelf.recipientPhone, "0909 111 222");
  assert.equal(normalizedSelf.isSurprise, false, "self-recipient orders cannot be marked surprise");

  const invalid = validateCheckout({ ...baseForm, buyerName: "", buyerPhone: "abc", buyerEmail: "broken", recipientName: "", deliveryAddress: "x", deliveryDate: "2020-01-01" });
  assert.equal(invalid.buyerName, "nameRequired");
  assert.equal(invalid.buyerPhone, "phoneInvalid");
  assert.equal(invalid.buyerEmail, "emailInvalid");
  assert.equal(invalid.recipientName, "nameRequired");
  assert.equal(invalid.deliveryAddress, "addressRequired");
  assert.equal(invalid.deliveryDate, "datePast");
  assert.equal(validateCheckoutField("deliveryDate", { ...baseForm, deliveryDate: "2026-02-30" }), "dateInvalid");

  const payload = domain.createCheckoutPayload(baseForm, [readyLine, customLine], "vi", 30_000);
  assert.equal(payload.items.length, 2, "mixed Cart should produce one mixed order payload");
  assert.deepEqual(payload.items[0], {
    type: "READY_MADE_PRODUCT",
    product_id: readyLine.productId,
    product_code: readyLine.productCode,
    variant_id: readyLine.variantId,
    variant_code: readyLine.variantCode,
    tone_code: readyLine.toneCode,
    quantity: 2,
  });
  assert.deepEqual(payload.items[1].flowers, [{ flower_id: customLine.flowers[0].flowerId, flower_code: "garden-rose", quantity: 5 }]);
  assert.equal(payload.recipient.is_surprise, true);
  assert.equal(payload.review.delivery_fee, 30_000);
  assert.equal(payload.review.total, 240_365_000);
  assert.equal(domain.checkoutSubtotal([readyLine, customLine]), 240_335_000);

  const changed = { ...readyLine, validation: { state: "changed", previousUnitPrice: 650_000 } };
  assert.equal(domain.inspectCheckoutLines([changed]).hasChangedPrices, true);
  const unavailable = { ...readyLine, validation: { state: "unavailable" } };
  assert.equal(domain.inspectCheckoutLines([unavailable]).hasUnavailableItems, true);
  assert.equal(domain.checkoutSubtotal([unavailable]), 0, "unavailable items must never contribute to reviewed subtotal");
  assert.throws(() => domain.createCheckoutPayload(baseForm, [unavailable], "vi", 30_000), /CHECKOUT_CART_INVALID/);

  assert.equal(receiptModule.isOrderReceipt({ version: 1 }), false, "malformed receipt must fail safely");
  assert.equal(receiptModule.isOrderReceipt({
    version: 1,
    orderId: "66666666-6666-4666-8666-666666666666",
    orderNumber: "LUM-0123456789ABCDEF",
    subtotalAmount: 240_335_000,
    deliveryFeeAmount: null,
    totalAmount: null,
    orderStatus: "PENDING",
    paymentStatus: "UNPAID",
    paymentMethod: "BANK_TRANSFER",
    placedAt: "2026-10-04T00:00:00.000Z",
    locale: "vi",
  }), true, "valid minimal receipt should be accepted");
  assert.equal(receiptModule.isOrderReceipt({
    version: 1,
    orderId: "66666666-6666-4666-8666-666666666666",
    orderNumber: "LUM-0123456789ABCDEF",
    subtotalAmount: 240_335_000,
    deliveryFeeAmount: 30_000,
    totalAmount: 1,
    orderStatus: "PENDING",
    paymentStatus: "UNPAID",
    paymentMethod: "BANK_TRANSFER",
    placedAt: "2026-10-04T00:00:00.000Z",
    locale: "vi",
  }), false, "tampered receipt totals should fail safely");
  const v2Receipt = {
    version: 2,
    orderId: "99999999-9999-4999-8999-999999999999",
    orderNumber: "LUM-0123456789ABCDEF",
    subtotalAmount: 240_335_000,
    deliveryFeeAmount: 30_000,
    totalAmount: 240_365_000,
    orderStatus: "PENDING",
    paymentStatus: "UNPAID",
    paymentMethod: "BANK_TRANSFER",
    fulfillmentType: "DELIVERY",
    fulfillmentName: "Nội thành",
    deliveryAreaName: "Quận 1",
    deliveryWindowLabel: "09:00–12:00",
    paymentReference: "LUMEA LUM0123456789ABCDEF",
    bankId: "970436",
    bankName: "Vietcombank",
    accountNumber: "123456789",
    accountHolder: "LUMEA FLOWER STUDIO",
    vietqrTemplate: "compact2",
    paymentInstruction: "Vui lòng chuyển đúng nội dung.",
    paymentDeadlineAt: "2026-10-05T12:00:00.000Z",
    placedAt: "2026-10-04T00:00:00.000Z",
    locale: "vi",
  };
  assert.equal(receiptModule.isOrderReceipt(v2Receipt), true, "valid Step 14 receipt should be accepted");
  const qrUrl = receiptModule.vietQrImageUrl(v2Receipt);
  assert(qrUrl.includes("970436-123456789-compact2.png"));
  assert(qrUrl.includes("amount=240365000"));
  assert(qrUrl.includes("addInfo=LUMEA+LUM0123456789ABCDEF"));
  assert(!qrUrl.includes("paymentInstruction"), "QR URL must contain only the minimum payment fields");

  console.log("Checkout validation, mapping, mixed Cart, stale/unavailable, subtotal, and receipt checks passed.");
} finally {
  await vite.close();
}
