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

const validPayload = {
  locale: "vi",
  buyer: { name: "LUMEA QA SECURITY", phone: "0900000000", email: null },
  recipient: { name: "LUMEA QA SECURITY", phone: "0900000000", buyer_is_recipient: true, is_surprise: false },
  delivery: { address: "QA ONLY - KHONG GIAO", notes: null, requested_date: vietnamDateTomorrow() },
  card_message: null,
  payment_method: "BANK_TRANSFER",
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

const reviewedSubtotal = variant.price_amount;
const rpcArgs = (payload, subtotal = reviewedSubtotal) => ({
  checkout_payload: payload,
  checkout_idempotency_key: randomUUID(),
  reviewed_subtotal: subtotal,
});

await expectRpcError("Malformed payload", rpcArgs(null, 0), "CHECKOUT_PAYLOAD_INVALID");
await expectRpcError("Privileged status mass assignment", rpcArgs({ ...validPayload, status: "COMPLETED", payment_status: "PAID" }), "CHECKOUT_PAYLOAD_FIELDS_INVALID");
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

for (const table of ["orders", "order_items", "order_recipients", "order_addresses", "deliveries", "payments", "order_status_events"]) {
  await expectDenied(`Anonymous ${table} SELECT`, () => client.from(table).select("id").limit(1));
}
await expectDenied("Anonymous direct Order INSERT", () => client.from("orders").insert({}));
await expectDenied("Anonymous direct Order UPDATE", () => client.from("orders").update({ status: "COMPLETED" }).eq("id", randomUUID()));
await expectDenied("Anonymous direct Order DELETE", () => client.from("orders").delete().eq("id", randomUUID()));

console.log("Checkout runtime security check passed: malformed/tampered payloads rejected; source identities revalidated; anonymous Order read/write denied.");
