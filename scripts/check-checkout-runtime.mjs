import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function vietnamDateTomorrow() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function expectDenied(label, operation) {
  const result = await operation();
  assert(result.error, `${label} unexpectedly succeeded.`);
  assert(result.error.code === "42501" || /permission denied|row-level security/i.test(result.error.message), `${label} failed for the wrong reason (${result.error.code}: ${result.error.message}).`);
}

async function expectRpcError(label, args, expectedMessage) {
  const result = await client.rpc("create_checkout_order", args);
  assert(result.error, `${label} unexpectedly succeeded.`);
  assert(result.error.message.includes(expectedMessage), `${label} returned ${result.error.message}, expected ${expectedMessage}.`);
}

const env = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
assert(env.VITE_SUPABASE_URL?.includes("nihhynwvltttadlfatdm.supabase.co"), "The checkout runtime check is not targeting the Luméa project.");
assert(env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_"), "A browser-safe publishable key is required.");

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const safeOptionsResult = await client.rpc("get_checkout_options", { requested_locale: "vi" });
assert(!safeOptionsResult.error, `Could not load public checkout options (${safeOptionsResult.error?.code ?? "unknown"}).`);
const safeOptions = safeOptionsResult.data;
assert(safeOptions && typeof safeOptions === "object" && !Array.isArray(safeOptions), "Public checkout options have an invalid shape.");
for (const privateField of ["bank_id", "bank_name", "account_number", "account_holder", "transfer_reference_template", "payment_deadline_hours"]) {
  assert(!JSON.stringify(safeOptions).includes(`"${privateField}"`), `Public checkout options leaked ${privateField}.`);
}

const malformedArgs = (payload, subtotal = 0) => ({
  checkout_payload: payload,
  checkout_idempotency_key: randomUUID(),
  reviewed_subtotal: subtotal,
});
await expectRpcError("Malformed payload", malformedArgs(null), "CHECKOUT_PAYLOAD_INVALID");
await expectRpcError("Privileged status mass assignment", malformedArgs({
  locale: "vi",
  buyer: {},
  recipient: {},
  delivery: {},
  card_message: null,
  payment_method: "BANK_TRANSFER",
  review: {},
  items: [],
  status: "COMPLETED",
  payment_status: "PAID",
}), "CHECKOUT_PAYLOAD_FIELDS_INVALID");

for (const table of [
  "orders", "order_items", "order_recipients", "order_addresses", "deliveries", "payments",
  "order_status_events", "payment_status_events", "delivery_status_events", "delivery_settings",
  "delivery_zones", "delivery_zone_translations", "delivery_zone_areas", "delivery_windows", "payment_settings",
]) {
  await expectDenied(`Anonymous ${table} SELECT`, () => client.from(table).select("*").limit(1));
}
await expectDenied("Anonymous direct Order INSERT", () => client.from("orders").insert({}));
await expectDenied("Anonymous direct Order UPDATE", () => client.from("orders").update({ status: "COMPLETED" }).eq("id", randomUUID()));
await expectDenied("Anonymous direct Order DELETE", () => client.from("orders").delete().eq("id", randomUUID()));

const zones = Array.isArray(safeOptions.zones) ? safeOptions.zones : [];
const windows = Array.isArray(safeOptions.windows) ? safeOptions.windows : [];
const paymentMethods = safeOptions.payment_methods ?? {};
const selectedZone = zones.find((zone) => Array.isArray(zone.areas) && zone.areas.length > 0);
const selectedArea = selectedZone?.areas[0];
const selectedWindow = windows[0];
const deliveryPayment = paymentMethods.bank_transfer
  ? "BANK_TRANSFER"
  : paymentMethods.cash && paymentMethods.cash_delivery
    ? "CASH"
    : null;
const pickupPayment = paymentMethods.bank_transfer
  ? "BANK_TRANSFER"
  : paymentMethods.cash && paymentMethods.cash_pickup
    ? "CASH"
    : null;
const fulfillment = safeOptions.delivery_enabled && selectedZone && selectedArea && selectedWindow && deliveryPayment
  ? {
      type: "DELIVERY",
      name: selectedZone.name,
      fee: selectedZone.fee_amount,
      paymentMethod: deliveryPayment,
      delivery: {
        fulfillment_type: "DELIVERY",
        area_id: selectedArea.id,
        window_id: selectedWindow.id,
        address: "QA ONLY - KHONG GIAO",
        notes: null,
        requested_date: vietnamDateTomorrow(),
      },
    }
  : safeOptions.pickup_enabled && safeOptions.pickup && pickupPayment
    ? {
        type: "PICKUP",
        name: safeOptions.pickup.name,
        fee: 0,
        paymentMethod: pickupPayment,
        delivery: {
          fulfillment_type: "PICKUP",
          area_id: null,
          window_id: null,
          address: null,
          notes: null,
          requested_date: vietnamDateTomorrow(),
        },
      }
    : null;

if (!fulfillment) {
  console.log("Checkout runtime security check passed: safe public config returned no private payment fields; malformed/tampered payloads rejected; anonymous Order/config read/write denied. Authoritative pricing cases skipped because the owner has not enabled a complete production fulfillment/payment configuration.");
  process.exit(0);
}

const catalog = await client.from("products").select(`
  id, stable_code, availability,
  product_variants(id, stable_code, price_amount, active),
  product_tones(active, tones(stable_code))
`).eq("visibility", "PUBLISHED").eq("availability", "AVAILABLE").is("archived_at", null).limit(20);
assert(!catalog.error, `Could not load the public catalog (${catalog.error?.code ?? "unknown"}).`);
const product = catalog.data.find((candidate) => candidate.product_variants.some((variant) => variant.active));
assert(product, "No available Product with an active Variant exists for checkout boundary tests.");
const variant = product.product_variants.find((candidate) => candidate.active);
const toneCode = product.product_tones.find((candidate) => candidate.active)?.tones?.stable_code ?? null;

const [flowers, wrappingOptions, wrappingVariants, wrappingCompatibility] = await Promise.all([
  client.from("flower_stems").select("id, stable_code, price_per_stem_amount").eq("visibility", "PUBLISHED").eq("availability", "AVAILABLE").is("archived_at", null).limit(1),
  client.from("wrapping_options").select("id, stable_code, price_modifier_amount").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_variants").select("id, stable_code, price_modifier_amount").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_option_variants").select("wrapping_option_id, wrapping_variant_id, price_modifier_amount").eq("active", true).limit(1),
]);
for (const result of [flowers, wrappingOptions, wrappingVariants, wrappingCompatibility]) {
  assert(!result.error, `Could not load public Builder data (${result.error?.code ?? "unknown"}).`);
}
const flower = flowers.data[0];
const compatibility = wrappingCompatibility.data[0];
const wrappingOption = wrappingOptions.data.find((candidate) => candidate.id === compatibility?.wrapping_option_id);
const wrappingVariant = wrappingVariants.data.find((candidate) => candidate.id === compatibility?.wrapping_variant_id);
assert(flower && wrappingOption && wrappingVariant && compatibility, "No valid live Builder combination exists for checkout boundary tests.");

const reviewedSubtotal = variant.price_amount;
const validPayload = {
  locale: "vi",
  buyer: { name: "LUMEA QA SECURITY", phone: "0900000000", email: null },
  recipient: { name: "LUMEA QA SECURITY", phone: "0900000000", buyer_is_recipient: true, is_surprise: false },
  delivery: fulfillment.delivery,
  card_message: null,
  payment_method: fulfillment.paymentMethod,
  review: { delivery_fee: fulfillment.fee, total: reviewedSubtotal + fulfillment.fee },
  items: [{
    type: "READY_MADE_PRODUCT",
    product_id: product.id,
    product_code: product.stable_code,
    variant_id: variant.id,
    variant_code: variant.stable_code,
    tone_code: toneCode,
    quantity: 1,
  }],
};
const rpcArgs = (payload, subtotal = reviewedSubtotal) => ({
  checkout_payload: payload,
  checkout_idempotency_key: randomUUID(),
  reviewed_subtotal: subtotal,
});

await expectRpcError("Client price injection", rpcArgs({
  ...validPayload,
  items: [{ ...validPayload.items[0], unit_price: 1, line_total: 1 }],
}, 1), "CHECKOUT_READY_ITEM_INVALID");
await expectRpcError("Invalid quantity", rpcArgs({
  ...validPayload,
  items: [{ ...validPayload.items[0], quantity: 0 }],
}), "CHECKOUT_QUANTITY_INVALID");
await expectRpcError("Unknown Product", rpcArgs({
  ...validPayload,
  items: [{ ...validPayload.items[0], product_id: randomUUID(), product_code: "not-a-product" }],
}), "CHECKOUT_READY_ITEM_UNAVAILABLE");
await expectRpcError("Unknown Variant", rpcArgs({
  ...validPayload,
  items: [{ ...validPayload.items[0], variant_id: randomUUID(), variant_code: "not-a-variant" }],
}), "CHECKOUT_READY_ITEM_UNAVAILABLE");
await expectRpcError("Server-authoritative ready-made subtotal", rpcArgs(validPayload, reviewedSubtotal + 1), "CHECKOUT_REVIEW_CHANGED");
await expectRpcError("Server-authoritative delivery fee", rpcArgs({
  ...validPayload,
  review: { delivery_fee: fulfillment.fee + 1, total: reviewedSubtotal + fulfillment.fee + 1 },
}), "CHECKOUT_DELIVERY_REVIEW_CHANGED");

const validBuilderPayload = {
  ...validPayload,
  items: [{
    type: "CUSTOM_BOUQUET",
    quantity: 1,
    flowers: [{ flower_id: flower.id, flower_code: flower.stable_code, quantity: 1 }],
    wrapping: {
      type_id: wrappingOption.id,
      type_code: wrappingOption.stable_code,
      variant_id: wrappingVariant.id,
      variant_code: wrappingVariant.stable_code,
    },
  }],
};
const builderSubtotal = flower.price_per_stem_amount
  + wrappingOption.price_modifier_amount
  + wrappingVariant.price_modifier_amount
  + (compatibility.price_modifier_amount ?? 0);
validBuilderPayload.review = { delivery_fee: fulfillment.fee, total: builderSubtotal + fulfillment.fee };
await expectRpcError("Server-authoritative Builder subtotal", rpcArgs(validBuilderPayload, builderSubtotal + 1), "CHECKOUT_REVIEW_CHANGED");
await expectRpcError("Unknown Builder flower", rpcArgs({
  ...validPayload,
  items: [{
    type: "CUSTOM_BOUQUET",
    quantity: 1,
    flowers: [{ flower_id: randomUUID(), flower_code: "not-a-flower", quantity: 1 }],
    wrapping: { type_id: randomUUID(), type_code: "not-a-wrap", variant_id: randomUUID(), variant_code: "not-a-color" },
  }],
}), "CHECKOUT_BOUQUET_FLOWER_UNAVAILABLE");

console.log(`Checkout runtime security check passed using ${fulfillment.type} (${fulfillment.name}): public config is safe; malformed/tampered totals and source identities rejected; anonymous Order/config read/write denied. No valid Order was created.`);
