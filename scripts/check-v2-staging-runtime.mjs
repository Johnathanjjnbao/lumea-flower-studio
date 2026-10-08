import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function tomorrowInVietnam() {
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

const projectRef = process.env.LUMEA_EXPECTED_SUPABASE_PROJECT_REF?.trim();
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const origin = "http://localhost:5173";
const dummyToken = "XXXX.DUMMY.TOKEN.XXXX";

assert(projectRef, "LUMEA_EXPECTED_SUPABASE_PROJECT_REF is required.");
assert(supabaseUrl === `https://${projectRef}.supabase.co`, "The runtime target does not match the explicitly expected Supabase project.");
assert(publishableKey?.startsWith("sb_publishable_"), "A browser-safe publishable key is required.");

const client = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const directRpc = await client.rpc("create_checkout_order", {
  checkout_payload: {},
  checkout_idempotency_key: randomUUID(),
  reviewed_subtotal: 0,
});
assert(directRpc.error?.code === "42501" || /permission denied|not allowed to execute/i.test(directRpc.error?.message ?? ""), "Anonymous direct checkout RPC bypass was not denied.");

const [categories, navigation, products, flowers, options, variants, compatibility, checkoutOptions] = await Promise.all([
  client.from("categories").select("id, stable_code, slug, visibility, category_translations(locale, name)").eq("visibility", "PUBLISHED"),
  client.from("navigation_items").select("id, stable_code, destination_type, active, sort_order").eq("active", true).order("sort_order"),
  client.from("products").select("id, stable_code, availability, category_id, product_translations(locale, name), product_variants(id, stable_code, sku, price_amount, active), product_tones(active, tones(stable_code))").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("flower_stems").select("id, stable_code, price_per_stem_amount, availability, flower_stem_translations(locale, name)").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_options").select("id, stable_code, price_modifier_amount").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_variants").select("id, stable_code, price_modifier_amount").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_option_variants").select("wrapping_option_id, wrapping_variant_id, price_modifier_amount").eq("active", true),
  client.rpc("get_checkout_options", { requested_locale: "vi" }),
]);
for (const result of [categories, navigation, products, flowers, options, variants, compatibility, checkoutOptions]) {
  assert(!result.error, `Public staging query failed: ${result.error?.message ?? "unknown"}`);
}

assert(categories.data.some((item) => item.stable_code === "bouquets" && new Set(item.category_translations.map((translation) => translation.locale)).size === 2), "Published VI/KO Category fixture is missing.");
assert(navigation.data.length > 0, "Published Navigation is missing.");
const readyProduct = products.data.find((item) => item.stable_code === "qa-ready-bouquet" && item.availability === "AVAILABLE");
const seasonalProduct = products.data.find((item) => item.stable_code === "qa-seasonal-bouquet" && item.availability === "SEASONAL");
assert(readyProduct && seasonalProduct, "READY and SEASONAL Product fixtures are required.");
assert(readyProduct.category_id === categories.data.find((item) => item.stable_code === "bouquets")?.id, "Product Category assignment is incorrect.");
assert(new Set(readyProduct.product_translations.map((translation) => translation.locale)).size === 2, "READY Product VI/KO translations are missing.");
const activeReadyVariants = readyProduct.product_variants.filter((variant) => variant.active);
assert(activeReadyVariants.length >= 2 && activeReadyVariants.every((variant) => /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(variant.sku)), "Multiple active SKU fixtures are required.");

const flower = flowers.data.find((item) => item.stable_code === "qa-rose" && item.availability === "AVAILABLE");
const relation = compatibility.data.find((item) => options.data.some((option) => option.id === item.wrapping_option_id) && variants.data.some((variant) => variant.id === item.wrapping_variant_id));
const wrappingOption = options.data.find((item) => item.id === relation?.wrapping_option_id);
const wrappingVariant = variants.data.find((item) => item.id === relation?.wrapping_variant_id);
assert(flower && wrappingOption && wrappingVariant && relation, "Published Builder fixtures are incomplete.");
assert(new Set(flower.flower_stem_translations.map((translation) => translation.locale)).size === 2, "Builder VI/KO translations are missing.");

const publicOptions = checkoutOptions.data;
assert(publicOptions?.pickup_enabled && publicOptions?.payment_methods?.cash && publicOptions?.payment_methods?.cash_pickup, "Pickup + cash staging configuration is incomplete.");
assert(!JSON.stringify(publicOptions).includes("account_number"), "Public checkout options leaked private bank fields.");

const endpoint = `${supabaseUrl}/functions/v1/create-checkout-order`;
async function invoke({ payload, subtotal, key = randomUUID(), token = dummyToken, requestOrigin = origin }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      "content-type": "application/json",
      origin: requestOrigin,
    },
    body: JSON.stringify({
      request: { payload, idempotency_key: key, reviewed_subtotal: subtotal },
      turnstile_token: token,
    }),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* Empty/non-JSON denial bodies are expected for invalid origins. */ }
  return { status: response.status, body, key };
}

const basePayload = {
  locale: "vi",
  buyer: { name: "LUMEA STAGING QA", phone: "0900000000", email: null },
  recipient: { name: "LUMEA STAGING QA", phone: "0900000000", buyer_is_recipient: true, is_surprise: false },
  delivery: {
    fulfillment_type: "PICKUP",
    area_id: null,
    window_id: null,
    address: "",
    notes: "SANITIZED STAGING QA",
    requested_date: tomorrowInVietnam(),
  },
  card_message: null,
  payment_method: "CASH",
};

const invalidOrigin = await invoke({ payload: basePayload, subtotal: 0, requestOrigin: "https://attacker.example" });
assert(invalidOrigin.status === 403, "Untrusted checkout origin was not rejected.");

const standard = activeReadyVariants.find((variant) => variant.stable_code === "standard") ?? activeReadyVariants[0];
const deluxe = activeReadyVariants.find((variant) => variant.id !== standard.id);
const toneCode = readyProduct.product_tones.find((relationItem) => relationItem.active)?.tones?.stable_code ?? null;
const readyItem = {
  type: "READY_MADE_PRODUCT",
  product_id: readyProduct.id,
  product_code: readyProduct.stable_code,
  variant_id: standard.id,
  variant_code: standard.stable_code,
  sku: standard.sku,
  tone_code: toneCode,
  quantity: 1,
};
const builderItem = {
  type: "CUSTOM_BOUQUET",
  quantity: 1,
  flowers: [{ flower_id: flower.id, flower_code: flower.stable_code, quantity: 1 }],
  wrapping: {
    type_id: wrappingOption.id,
    type_code: wrappingOption.stable_code,
    variant_id: wrappingVariant.id,
    variant_code: wrappingVariant.stable_code,
  },
};
const builderSubtotal = flower.price_per_stem_amount + wrappingOption.price_modifier_amount
  + wrappingVariant.price_modifier_amount + (relation.price_modifier_amount ?? 0);
const payloadFor = (items, subtotal) => ({ ...basePayload, review: { delivery_fee: 0, total: subtotal }, items });

const readyKey = randomUUID();
const ready = await invoke({ payload: payloadFor([readyItem], standard.price_amount), subtotal: standard.price_amount, key: readyKey });
assert(ready.status === 200 && Array.isArray(ready.body?.data), `READY checkout failed (${ready.status}: ${JSON.stringify(ready.body)})`);
const readyRow = ready.body.data[0];
assert(!readyRow.was_duplicate && readyRow.subtotal_amount === standard.price_amount && readyRow.total_amount === standard.price_amount, "READY checkout totals are not authoritative.");

const retry = await invoke({ payload: payloadFor([readyItem], standard.price_amount), subtotal: standard.price_amount, key: readyKey });
assert(retry.status === 200 && retry.body?.data?.[0]?.was_duplicate && retry.body.data[0].order_id === readyRow.order_id, "Idempotent retry did not return the original Order.");

const builder = await invoke({ payload: payloadFor([builderItem], builderSubtotal), subtotal: builderSubtotal });
assert(builder.status === 200 && builder.body?.data?.[0]?.subtotal_amount === builderSubtotal, `Builder checkout failed (${builder.status}: ${JSON.stringify(builder.body)})`);

const mixedSubtotal = standard.price_amount + builderSubtotal;
const mixedKey = randomUUID();
const [mixedA, mixedB] = await Promise.all([
  invoke({ payload: payloadFor([readyItem, builderItem], mixedSubtotal), subtotal: mixedSubtotal, key: mixedKey }),
  invoke({ payload: payloadFor([readyItem, builderItem], mixedSubtotal), subtotal: mixedSubtotal, key: mixedKey }),
]);
assert(mixedA.status === 200 && mixedB.status === 200, `Concurrent mixed checkout failed (${mixedA.status}/${mixedB.status}).`);
assert(mixedA.body?.data?.[0]?.order_id === mixedB.body?.data?.[0]?.order_id, "Concurrent idempotent requests created different Orders.");

const badSku = await invoke({
  payload: payloadFor([{ ...readyItem, sku: "QA-NOT-A-REAL-SKU" }], standard.price_amount),
  subtotal: standard.price_amount,
});
assert(badSku.status === 409 && badSku.body?.code === "ITEM_UNAVAILABLE", "Unknown SKU was not rejected.");

const mismatchedSku = await invoke({
  payload: payloadFor([{ ...readyItem, sku: deluxe.sku }], standard.price_amount),
  subtotal: standard.price_amount,
});
assert(mismatchedSku.status === 409 && mismatchedSku.body?.code === "ITEM_UNAVAILABLE", "Mismatched SKU was not rejected.");

const throttled = await invoke({ payload: payloadFor([readyItem], standard.price_amount), subtotal: standard.price_amount });
assert(throttled.status === 429 && throttled.body?.code === "RATE_LIMITED", "Distinct-attempt throttle was not enforced.");

console.log(JSON.stringify({
  projectRef,
  categories: categories.data.length,
  navigation: navigation.data.length,
  readyOrderId: readyRow.order_id,
  builderOrderId: builder.body.data[0].order_id,
  mixedOrderId: mixedA.body.data[0].order_id,
  turnstile: "official testing-key marker/token and origin validated; production hostname/action covered by unit checks",
  throttle: "PASS",
  idempotency: "PASS",
  checkoutModes: ["READY_MADE", "BUILDER", "MIXED"],
}));
