import type { FlowerQuantities, FlowerStem, WrappingType, WrappingVariant } from "./types";

// Frontend demo data for Step 7B-1. Stable IDs keep it ready for a future Admin/data source.
export const flowerStems: readonly FlowerStem[] = [
  { id: "garden-rose", image: "detailRose", pricePerStem: 45_000, availability: "AVAILABLE", toneIds: ["pink", "romantic"] },
  { id: "pink-tulip", image: "productPeony", pricePerStem: 35_000, availability: "SEASONAL", toneIds: ["pink", "pastel"] },
  { id: "white-rose", image: "detailWhiteRose", pricePerStem: 38_000, availability: "AVAILABLE", toneIds: ["white", "quiet"] },
  { id: "pink-calla", image: "detailCalla", pricePerStem: 48_000, availability: "AVAILABLE", toneIds: ["pink", "botanical"] },
  { id: "ranunculus", image: "productWarm", pricePerStem: 42_000, availability: "SEASONAL", toneIds: ["warm", "soft"] },
  { id: "hydrangea", image: "productHydrangea", pricePerStem: 95_000, availability: "SEASONAL", toneIds: ["pastel", "statement"] },
  { id: "chrysanthemum", image: "productAmberStudy", pricePerStem: 28_000, availability: "AVAILABLE", toneIds: ["warm", "textural"] },
  { id: "red-lily", image: "productVelvet", pricePerStem: 55_000, availability: "UNAVAILABLE", toneIds: ["burgundy", "romantic"] },
];

export const wrappingTypes: readonly WrappingType[] = [
  { id: "classic-paper", priceModifier: 0, compatibleVariantIds: ["ivory", "blush", "sage"] },
  { id: "kraft-natural", priceModifier: 30_000, compatibleVariantIds: ["kraft"] },
  { id: "layered-wrap", priceModifier: 90_000, compatibleVariantIds: ["ivory", "blush", "burgundy"] },
];

export const wrappingVariants: readonly WrappingVariant[] = [
  { id: "ivory", priceModifier: 0, swatch: "#eee8de" },
  { id: "blush", priceModifier: 0, swatch: "#d8aaa9" },
  { id: "sage", priceModifier: 0, swatch: "#aab39c" },
  { id: "burgundy", priceModifier: 15_000, swatch: "#6d3b47" },
  { id: "kraft", priceModifier: 0, swatch: "#b99b78" },
];

export const initialFlowerQuantities = Object.fromEntries(
  flowerStems.map((flower) => [flower.id, 0]),
) as FlowerQuantities;

export const defaultWrappingTypeId = "classic-paper" as const;
export const defaultWrappingVariantId = "ivory" as const;
