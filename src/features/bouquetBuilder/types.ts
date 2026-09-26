import type { AssetKey } from "../../data/assets";
import type { ProductAvailability } from "../../types/content";

export type FlowerStemId =
  | "garden-rose"
  | "pink-tulip"
  | "white-rose"
  | "pink-calla"
  | "ranunculus"
  | "hydrangea"
  | "chrysanthemum"
  | "red-lily";

export type WrappingTypeId = "classic-paper" | "kraft-natural" | "layered-wrap";
export type WrappingVariantId = "ivory" | "blush" | "sage" | "burgundy" | "kraft";

export interface FlowerStem {
  id: FlowerStemId;
  image: AssetKey;
  pricePerStem: number;
  availability: ProductAvailability;
  toneIds: readonly string[];
}

export interface WrappingType {
  id: WrappingTypeId;
  priceModifier: number;
  compatibleVariantIds: readonly WrappingVariantId[];
}

export interface WrappingVariant {
  id: WrappingVariantId;
  priceModifier: number;
  swatch: string;
}

export type FlowerQuantities = Record<FlowerStemId, number>;

export interface BouquetBuilderResult {
  type: "CUSTOM_BOUQUET";
  version: 1;
  flowers: Array<{
    flowerId: FlowerStemId;
    quantity: number;
    unitPrice: number;
  }>;
  wrapping: {
    typeId: WrappingTypeId;
    variantId: WrappingVariantId;
    priceModifier: number;
  };
  totalStemCount: number;
  totalPrice: number;
}
