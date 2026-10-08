import assert from "node:assert/strict";
import {
  createCustomBouquetCartItem,
  createReadyMadeCartItem,
  getCartItemCount,
  getCartSubtotal,
  mergeCartItem,
  removeCartLine,
  setCartLineQuantity,
} from "../src/features/cart/domain.ts";
import { CART_STORAGE_KEY, readCart, restoreCart, writeCart } from "../src/features/cart/persistence.ts";
import { reconcileCartItems } from "../src/features/cart/reconciliation.ts";
import { createBouquetResult } from "../src/features/bouquetBuilder/pricing.ts";

const product = {
  id: "product-1", stableCode: "pink-garden", slug: "pink-garden", productType: "READY_MADE_BOUQUET",
  category: { id: "category-1", stableCode: "bouquets", slug: "bouquets", name: "Hoa bó", description: null, sortOrder: 0 },
  availability: "AVAILABLE", sameDayEligible: true, featured: true, bestseller: true, sortOrder: 0,
  name: "Pink Garden", shortDescription: null, description: null, composition: [], seoTitle: null, seoDescription: null,
  startingPriceAmount: 550_000,
  variants: [
    { id: "variant-1", stableCode: "standard", sku: "LUM-PINK-GARDEN-STANDARD", name: "Standard", description: null, priceAmount: 550_000, sortOrder: 0 },
    { id: "variant-2", stableCode: "large", sku: "LUM-PINK-GARDEN-LARGE", name: "Large", description: null, priceAmount: 750_000, sortOrder: 1 },
  ],
  images: [{ id: "image-1", url: "https://example.test/pink.jpg", altText: "Pink bouquet", caption: null, role: "PRIMARY", sortOrder: 0 }],
  occasionCodes: [], occasions: [], tones: [{ stableCode: "pink", name: "Pink", swatchValue: "#D9A4AC", sortOrder: 0 }],
};

const flowers = [
  { id: "flower-1", stableCode: "garden-rose", name: "Garden rose", description: "", imageUrl: "https://example.test/rose.jpg", imageAlt: "Rose", pricePerStem: 45_000, availability: "AVAILABLE", sortOrder: 0 },
  { id: "flower-2", stableCode: "white-rose", name: "White rose", description: "", imageUrl: "https://example.test/white.jpg", imageAlt: "White rose", pricePerStem: 38_000, availability: "AVAILABLE", sortOrder: 1 },
];
const wrappingVariants = [{ id: "wrap-color-1", stableCode: "ivory", name: "Ivory", priceModifier: 10_000, swatch: "#EEE8DE", sortOrder: 0 }];
const wrappingTypes = [{ id: "wrap-1", stableCode: "classic-paper", name: "Classic", description: "", priceModifier: 20_000, compatibleVariantIds: ["wrap-color-1"], compatibilityPriceModifiers: { "wrap-color-1": 5_000 }, sortOrder: 0 }];
const builderCatalog = { flowers, wrappingTypes, wrappingVariants };

const ready = createReadyMadeCartItem(product, "variant-1", "pink", 1);
assert.ok(ready, "available product should create a cart item");
assert.equal(createReadyMadeCartItem({ ...product, availability: "SEASONAL" }, "variant-1", "pink", 1), null, "seasonal products must stay visible but not enter Cart");
let lines = mergeCartItem([], ready);
assert.equal(lines.length, 1);
lines = mergeCartItem(lines, ready);
assert.equal(lines.length, 1, "identical product configuration should merge");
assert.equal(lines[0].quantity, 2);
const refreshedReady = { ...ready, unitPriceSnapshot: 600_000, display: { ...ready.display, productName: "Pink Garden refreshed" } };
lines = mergeCartItem(lines, refreshedReady);
assert.equal(lines[0].unitPriceSnapshot, 600_000, "merging a live configuration must refresh its price snapshot");
assert.equal(lines[0].display.productName, "Pink Garden refreshed");

const distinctVariant = createReadyMadeCartItem(product, "variant-2", "pink", 1);
assert.ok(distinctVariant);
lines = mergeCartItem(lines, distinctVariant);
assert.equal(lines.length, 2, "different variants must remain distinct");

const result = createBouquetResult(flowers, { "flower-1": 3, "flower-2": 2 }, wrappingTypes[0], wrappingVariants[0]);
const custom = createCustomBouquetCartItem(result, builderCatalog);
assert.ok(custom, "valid completed bouquet should create a cart item");
const seasonalBuilder = { ...builderCatalog, flowers: builderCatalog.flowers.map((flower) => flower.id === "flower-1" ? { ...flower, availability: "SEASONAL" } : flower) };
assert.equal(createCustomBouquetCartItem(result, seasonalBuilder), null, "seasonal stems must not enter Cart");
lines = mergeCartItem(lines, custom);
assert.equal(lines.length, 3, "ready-made and custom bouquets should coexist");

lines = setCartLineQuantity(lines, ready.id, 4);
assert.equal(lines.find((line) => line.id === ready.id)?.quantity, 4);
lines = setCartLineQuantity(lines, ready.id, -10);
assert.equal(lines.find((line) => line.id === ready.id)?.quantity, 1, "quantity must not reach zero or negative");
lines = setCartLineQuantity(lines, ready.id, Number.NaN);
assert.equal(lines.find((line) => line.id === ready.id)?.quantity, 1, "NaN quantity must fail safely");
lines = setCartLineQuantity(lines, ready.id, 9999);
assert.equal(lines.find((line) => line.id === ready.id)?.quantity, 20, "quantity must be bounded");

assert.equal(getCartItemCount(lines), 22);
const expectedSubtotal = (600_000 * 20) + 750_000 + custom.unitPriceSnapshot;
assert.equal(getCartSubtotal(lines), expectedSubtotal);

const memory = new Map();
const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };
writeCart(lines.map(({ validation: _validation, ...item }) => item), storage);
assert.equal(readCart(storage).length, 3, "persisted cart should restore");
assert.ok(memory.has(CART_STORAGE_KEY));
const legacyReady = { ...ready };
delete legacyReady.sku;
const restoredLegacyReady = restoreCart(JSON.stringify({ version: 1, items: [legacyReady] }))[0];
assert.equal(restoredLegacyReady?.type, "READY_MADE_PRODUCT");
assert.equal(restoredLegacyReady?.sku, null, "V1 carts without SKU must remain readable");
const upgradedLegacyReady = reconcileCartItems([restoredLegacyReady], [product], builderCatalog)[0];
assert.equal(upgradedLegacyReady?.type, "READY_MADE_PRODUCT");
assert.equal(upgradedLegacyReady?.sku, "LUM-PINK-GARDEN-STANDARD", "catalog reconciliation must upgrade legacy carts with the authoritative SKU");
assert.deepEqual(restoreCart("not-json"), []);
assert.deepEqual(restoreCart(JSON.stringify({ version: 999, items: [] })), []);
assert.deepEqual(restoreCart(JSON.stringify({ version: 1, items: [{ type: "READY_MADE_PRODUCT", quantity: "hacked" }] })), []);
const forgedCustom = { ...custom, id: "custom:forged", configurationKey: "forged", totalStemCount: 999 };
const restoredCustom = restoreCart(JSON.stringify({ version: 1, items: [forgedCustom] }))[0];
assert.equal(restoredCustom?.type, "CUSTOM_BOUQUET");
assert.equal(restoredCustom?.id, custom.id, "custom identity must be derived from validated source codes");
assert.equal(restoredCustom?.totalStemCount, custom.totalStemCount, "stem totals must be derived from validated flower quantities");
assert.deepEqual(restoreCart(JSON.stringify({ version: 1, items: [{ ...ready, quantity: "2" }] })), [], "string quantities must not be trusted");

const repricedProduct = { ...product, variants: product.variants.map((variant) => variant.id === "variant-1" ? { ...variant, priceAmount: 120_000_000 } : variant) };
const reconciled = reconcileCartItems([ready, custom], [repricedProduct], builderCatalog);
assert.equal(reconciled[0].validation.state, "changed");
assert.equal(reconciled[0].unitPriceSnapshot, 120_000_000, "live price must replace the local snapshot");
assert.equal(reconciled[0].validation.previousUnitPrice, 550_000);

const unavailableProduct = { ...product, availability: "UNAVAILABLE" };
const unavailable = reconcileCartItems([ready], [unavailableProduct], builderCatalog)[0];
assert.equal(unavailable.validation.state, "unavailable");
assert.equal(getCartSubtotal([unavailable]), 0, "unavailable lines must not contribute to subtotal");
assert.equal(reconcileCartItems([ready], [{ ...product, availability: "SEASONAL" }], builderCatalog)[0].validation.state, "unavailable");

const unavailableBuilder = { ...builderCatalog, flowers: builderCatalog.flowers.map((flower) => flower.id === "flower-1" ? { ...flower, availability: "UNAVAILABLE" } : flower) };
assert.equal(reconcileCartItems([custom], [product], unavailableBuilder)[0].validation.state, "unavailable");
assert.equal(reconcileCartItems([custom], [product], seasonalBuilder)[0].validation.state, "unavailable");
const repricedBuilder = { ...builderCatalog, flowers: builderCatalog.flowers.map((flower) => flower.id === "flower-1" ? { ...flower, pricePerStem: flower.pricePerStem + 10_000 } : flower) };
const repricedCustom = reconcileCartItems([custom], [product], repricedBuilder)[0];
assert.equal(repricedCustom.validation.state, "changed");
assert.ok(repricedCustom.unitPriceSnapshot > custom.unitPriceSnapshot, "builder prices must be recalculated from the live catalog");
const incompatibleBuilder = { ...builderCatalog, wrappingTypes: [{ ...wrappingTypes[0], compatibleVariantIds: [] }] };
assert.equal(reconcileCartItems([custom], [product], incompatibleBuilder)[0].validation.state, "unavailable");
const missingVariantProduct = { ...product, variants: [] };
assert.equal(reconcileCartItems([ready], [missingVariantProduct], builderCatalog)[0].validation.state, "unavailable");

lines = removeCartLine(lines, custom.id);
assert.equal(lines.some((line) => line.id === custom.id), false);

console.log("Cart domain, persistence, reconciliation, and count checks passed.");
