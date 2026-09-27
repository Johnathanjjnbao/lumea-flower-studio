import assert from "node:assert/strict";
import { calculateBouquetPricing, clampFlowerQuantity, createBouquetResult } from "../src/features/bouquetBuilder/pricing.ts";

const flowers = [
  { id: "flower-1", stableCode: "garden-rose", name: "Garden rose", description: "", imageUrl: "https://example.test/rose.jpg", imageAlt: "Rose", pricePerStem: 45_000, availability: "AVAILABLE", sortOrder: 0 },
  { id: "flower-2", stableCode: "pink-tulip", name: "Pink tulip", description: "", imageUrl: "https://example.test/tulip.jpg", imageAlt: "Tulip", pricePerStem: 35_000, availability: "SEASONAL", sortOrder: 10 },
  { id: "flower-3", stableCode: "red-lily", name: "Red lily", description: "", imageUrl: "https://example.test/lily.jpg", imageAlt: "Lily", pricePerStem: 55_000, availability: "UNAVAILABLE", sortOrder: 20 },
];
const quantities = { "flower-1": 5, "flower-2": 3, "flower-3": 8 };
const wrappingType = { id: "wrap-1", stableCode: "layered-wrap", name: "Layered", description: "", priceModifier: 90_000, compatibleVariantIds: ["color-1"], compatibilityPriceModifiers: { "color-1": 5_000 }, sortOrder: 0 };
const wrappingVariant = { id: "color-1", stableCode: "burgundy", name: "Burgundy", priceModifier: 15_000, swatch: "#6d3b47", sortOrder: 0 };

const pricing = calculateBouquetPricing(flowers, quantities, wrappingType, wrappingVariant);
assert.deepEqual(pricing, {
  flowerSubtotal: 330_000,
  wrappingPrice: 110_000,
  totalStemCount: 8,
  totalPrice: 440_000,
});
assert.equal(clampFlowerQuantity(-4), 0);
assert.equal(clampFlowerQuantity(999), 20);
assert.equal(clampFlowerQuantity(Number.NaN), 0);

const result = createBouquetResult(flowers, quantities, wrappingType, wrappingVariant);
assert.equal(result.type, "CUSTOM_BOUQUET");
assert.equal(result.totalPrice, 440_000);
assert.deepEqual(result.flowers.map(({ flowerId, quantity }) => ({ flowerId, quantity })), [
  { flowerId: "flower-1", quantity: 5 },
  { flowerId: "flower-2", quantity: 3 },
]);
assert.equal(result.flowers.some(({ flowerId }) => flowerId === "flower-3"), false);
assert.equal(result.flowers[0].flowerCode, "garden-rose");
assert.equal(result.wrapping.typeCode, "layered-wrap");

console.log("Builder pricing checks passed.");
