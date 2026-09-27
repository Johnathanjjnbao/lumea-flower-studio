import type { AssetKey } from "../../data/assets";
import type { ProductAvailability } from "../../types/content";

interface FlowerStemFixture {
  id: string;
  image: AssetKey;
  pricePerStem: number;
  availability: ProductAvailability;
  toneIds: readonly string[];
}

interface WrappingTypeFixture {
  id: string;
  priceModifier: number;
  compatibleVariantIds: readonly string[];
}

interface WrappingVariantFixture {
  id: string;
  priceModifier: number;
  swatch: string;
}

// Import/seed fixture only. The production Builder reads Supabase through its repository.
export const flowerStems: readonly FlowerStemFixture[] = [
  { id: "garden-rose", image: "detailRose", pricePerStem: 45_000, availability: "AVAILABLE", toneIds: ["pink", "romantic"] },
  { id: "pink-tulip", image: "productPeony", pricePerStem: 35_000, availability: "SEASONAL", toneIds: ["pink", "pastel"] },
  { id: "white-rose", image: "detailWhiteRose", pricePerStem: 38_000, availability: "AVAILABLE", toneIds: ["white", "quiet"] },
  { id: "pink-calla", image: "detailCalla", pricePerStem: 48_000, availability: "AVAILABLE", toneIds: ["pink", "botanical"] },
  { id: "ranunculus", image: "productWarm", pricePerStem: 42_000, availability: "SEASONAL", toneIds: ["warm", "soft"] },
  { id: "hydrangea", image: "productHydrangea", pricePerStem: 95_000, availability: "SEASONAL", toneIds: ["pastel", "statement"] },
  { id: "chrysanthemum", image: "productAmberStudy", pricePerStem: 28_000, availability: "AVAILABLE", toneIds: ["warm", "textural"] },
  { id: "red-lily", image: "productVelvet", pricePerStem: 55_000, availability: "UNAVAILABLE", toneIds: ["burgundy", "romantic"] },
];

export const wrappingTypes: readonly WrappingTypeFixture[] = [
  { id: "classic-paper", priceModifier: 0, compatibleVariantIds: ["ivory", "blush", "sage"] },
  { id: "kraft-natural", priceModifier: 30_000, compatibleVariantIds: ["kraft"] },
  { id: "layered-wrap", priceModifier: 90_000, compatibleVariantIds: ["ivory", "blush", "burgundy"] },
];

export const wrappingVariants: readonly WrappingVariantFixture[] = [
  { id: "ivory", priceModifier: 0, swatch: "#eee8de" },
  { id: "blush", priceModifier: 0, swatch: "#d8aaa9" },
  { id: "sage", priceModifier: 0, swatch: "#aab39c" },
  { id: "burgundy", priceModifier: 15_000, swatch: "#6d3b47" },
  { id: "kraft", priceModifier: 0, swatch: "#b99b78" },
];
