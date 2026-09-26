import assert from "node:assert/strict";
import { calculateBouquetPricing, clampFlowerQuantity, createBouquetResult } from "../src/features/bouquetBuilder/pricing.ts";

const flowers = [
  { id: "garden-rose", image: "detailRose", pricePerStem: 45_000, availability: "AVAILABLE", toneIds: [] },
  { id: "pink-tulip", image: "productPeony", pricePerStem: 35_000, availability: "SEASONAL", toneIds: [] },
  { id: "red-lily", image: "productVelvet", pricePerStem: 55_000, availability: "UNAVAILABLE", toneIds: [] },
];
const quantities = { "garden-rose": 5, "pink-tulip": 3, "red-lily": 8 };
const wrappingType = { id: "layered-wrap", priceModifier: 90_000, compatibleVariantIds: ["burgundy"] };
const wrappingVariant = { id: "burgundy", priceModifier: 15_000, swatch: "#6d3b47" };

const pricing = calculateBouquetPricing(flowers, quantities, wrappingType, wrappingVariant);
assert.deepEqual(pricing, {
  flowerSubtotal: 330_000,
  wrappingPrice: 105_000,
  totalStemCount: 8,
  totalPrice: 435_000,
});
assert.equal(clampFlowerQuantity(-4), 0);
assert.equal(clampFlowerQuantity(999), 20);
assert.equal(clampFlowerQuantity(Number.NaN), 0);

const result = createBouquetResult(flowers, quantities, wrappingType, wrappingVariant);
assert.equal(result.type, "CUSTOM_BOUQUET");
assert.equal(result.totalPrice, 435_000);
assert.deepEqual(result.flowers.map(({ flowerId, quantity }) => ({ flowerId, quantity })), [
  { flowerId: "garden-rose", quantity: 5 },
  { flowerId: "pink-tulip", quantity: 3 },
]);
assert.equal(result.flowers.some(({ flowerId }) => flowerId === "red-lily"), false);

console.log("Builder pricing checks passed.");
