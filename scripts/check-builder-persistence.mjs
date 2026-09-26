import assert from "node:assert/strict";
import {
  BOUQUET_DRAFT_STORAGE_KEY,
  clearBouquetDraft,
  createBouquetDraft,
  readBouquetDraft,
  restoreBouquetDraft,
  writeBouquetDraft,
} from "../src/features/bouquetBuilder/persistence.ts";
import { initialFlowerQuantities } from "../src/features/bouquetBuilder/data.ts";

assert.equal(restoreBouquetDraft("not-json"), null);
assert.equal(restoreBouquetDraft(JSON.stringify({ version: 0 })), null);

const hardened = restoreBouquetDraft(JSON.stringify({
  version: 1,
  quantities: {
    "garden-rose": 999,
    "pink-tulip": -4,
    "white-rose": "3",
    "red-lily": 8,
    "removed-flower": 5,
  },
  wrapping: { typeId: "removed-wrap", variantId: "burgundy" },
}));

assert.ok(hardened);
assert.equal(hardened.quantities["garden-rose"], 20);
assert.equal(hardened.quantities["pink-tulip"], 0);
assert.equal(hardened.quantities["white-rose"], 0);
assert.equal(hardened.quantities["red-lily"], 0);
assert.equal(hardened.wrappingTypeId, "classic-paper");
assert.equal(hardened.wrappingVariantId, "ivory");

const compatible = restoreBouquetDraft(JSON.stringify({
  version: 1,
  quantities: { "pink-calla": 3 },
  wrapping: { typeId: "layered-wrap", variantId: "burgundy" },
}));
assert.ok(compatible);
assert.equal(compatible.quantities["pink-calla"], 3);
assert.equal(compatible.wrappingTypeId, "layered-wrap");
assert.equal(compatible.wrappingVariantId, "burgundy");

const quantities = { ...initialFlowerQuantities, "garden-rose": 2, "red-lily": 9 };
const draft = createBouquetDraft(quantities, "classic-paper", "blush");
assert.deepEqual(draft.quantities, { "garden-rose": 2 });

const memory = new Map();
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};
writeBouquetDraft(quantities, "classic-paper", "blush", storage);
assert.equal(readBouquetDraft(storage)?.quantities["garden-rose"], 2);
clearBouquetDraft(storage);
assert.equal(memory.has(BOUQUET_DRAFT_STORAGE_KEY), false);

console.log("Builder persistence checks passed.");
