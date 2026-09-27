import type { ProductAvailability } from "../../types/content";

export type FlowerStemId = string;
export type WrappingTypeId = string;
export type WrappingVariantId = string;

export interface FlowerStem {
  id: FlowerStemId;
  stableCode: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  pricePerStem: number;
  availability: ProductAvailability;
  sortOrder: number;
}

export interface WrappingType {
  id: WrappingTypeId;
  stableCode: string;
  name: string;
  description: string;
  priceModifier: number;
  compatibleVariantIds: readonly WrappingVariantId[];
  compatibilityPriceModifiers: Readonly<Record<WrappingVariantId, number>>;
  sortOrder: number;
}

export interface WrappingVariant {
  id: WrappingVariantId;
  stableCode: string;
  name: string;
  priceModifier: number;
  swatch: string;
  sortOrder: number;
}

export type FlowerQuantities = Record<FlowerStemId, number>;

export interface BouquetBuilderCatalog {
  flowers: FlowerStem[];
  wrappingTypes: WrappingType[];
  wrappingVariants: WrappingVariant[];
}

export interface BouquetBuilderResult {
  type: "CUSTOM_BOUQUET";
  version: 2;
  flowers: Array<{
    flowerId: FlowerStemId;
    flowerCode: string;
    quantity: number;
    unitPrice: number;
  }>;
  wrapping: {
    typeId: WrappingTypeId;
    typeCode: string;
    variantId: WrappingVariantId;
    variantCode: string;
    priceModifier: number;
  };
  totalStemCount: number;
  totalPrice: number;
}
