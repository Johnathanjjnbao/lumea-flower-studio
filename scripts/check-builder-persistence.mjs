import assert from "node:assert/strict";
import {
  BOUQUET_DRAFT_STORAGE_KEY, clearBouquetDraft, createBouquetDraft,
  createInitialFlowerQuantities, readBouquetDraft, restoreBouquetDraft, writeBouquetDraft,
} from "../src/features/bouquetBuilder/persistence.ts";

const flowers = [
  { id: "flower-1", stableCode: "garden-rose", name: "Garden rose", description: "", imageUrl: "x", imageAlt: "Rose", pricePerStem: 45_000, availability: "AVAILABLE", sortOrder: 0 },
  { id: "flower-2", stableCode: "pink-tulip", name: "Pink tulip", description: "", imageUrl: "x", imageAlt: "Tulip", pricePerStem: 35_000, availability: "SEASONAL", sortOrder: 10 },
  { id: "flower-3", stableCode: "white-rose", name: "White rose", description: "", imageUrl: "x", imageAlt: "Rose", pricePerStem: 38_000, availability: "AVAILABLE", sortOrder: 20 },
  { id: "flower-4", stableCode: "red-lily", name: "Red lily", description: "", imageUrl: "x", imageAlt: "Lily", pricePerStem: 55_000, availability: "UNAVAILABLE", sortOrder: 30 },
];
const wrappingVariants = [
  { id: "color-1", stableCode: "ivory", name: "Ivory", priceModifier: 0, swatch: "#EEE8DE", sortOrder: 0 },
  { id: "color-2", stableCode: "burgundy", name: "Burgundy", priceModifier: 15_000, swatch: "#6D3B47", sortOrder: 10 },
];
const wrappingTypes = [
  { id: "wrap-1", stableCode: "classic-paper", name: "Classic", description: "", priceModifier: 0, compatibleVariantIds: ["color-1"], compatibilityPriceModifiers: { "color-1": 0 }, sortOrder: 0 },
  { id: "wrap-2", stableCode: "layered-wrap", name: "Layered", description: "", priceModifier: 90_000, compatibleVariantIds: ["color-1", "color-2"], compatibilityPriceModifiers: { "color-1": 0, "color-2": 0 }, sortOrder: 10 },
];
const catalog = { flowers, wrappingTypes, wrappingVariants };

assert.equal(restoreBouquetDraft("not-json", catalog), null);
assert.equal(restoreBouquetDraft(JSON.stringify({ version: 1 }), catalog), null);

const hardened = restoreBouquetDraft(JSON.stringify({
  version: 2,
  quantities: { "garden-rose": 999, "pink-tulip": -4, "white-rose": "3", "red-lily": 8, "removed-flower": 5 },
  wrapping: { typeCode: "removed-wrap", variantCode: "burgundy" },
}), catalog);
assert.ok(hardened);
assert.equal(hardened.quantities["flower-1"], 20);
assert.equal(hardened.quantities["flower-2"], 0);
assert.equal(hardened.quantities["flower-3"], 0);
assert.equal(hardened.quantities["flower-4"], 0);
assert.equal(hardened.wrappingTypeId, "wrap-1");
assert.equal(hardened.wrappingVariantId, "color-1");

const compatible = restoreBouquetDraft(JSON.stringify({
  version: 2,
  quantities: { "white-rose": 3 },
  wrapping: { typeCode: "layered-wrap", variantCode: "burgundy" },
}), catalog);
assert.ok(compatible);
assert.equal(compatible.quantities["flower-3"], 3);
assert.equal(compatible.wrappingTypeId, "wrap-2");
assert.equal(compatible.wrappingVariantId, "color-2");

const quantities = { ...createInitialFlowerQuantities(catalog), "flower-1": 2, "flower-4": 9 };
const draft = createBouquetDraft(catalog, quantities, "wrap-1", "color-1");
assert.deepEqual(draft.quantities, { "garden-rose": 2 });
assert.equal("price" in draft, false);

const memory = new Map();
const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) };
writeBouquetDraft(catalog, quantities, "wrap-1", "color-1", storage);
assert.equal(readBouquetDraft(catalog, storage)?.quantities["flower-1"], 2);
clearBouquetDraft(storage);
assert.equal(memory.has(BOUQUET_DRAFT_STORAGE_KEY), false);

console.log("Builder persistence checks passed.");
