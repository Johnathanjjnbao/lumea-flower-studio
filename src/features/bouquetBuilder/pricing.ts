import type { BouquetBuilderResult, FlowerQuantities, FlowerStem, WrappingType, WrappingVariant } from "./types";

export const MAX_STEMS_PER_FLOWER = 20;

export function clampFlowerQuantity(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_STEMS_PER_FLOWER, Math.max(0, Math.trunc(value)));
}

function getSelectableQuantity(flower: FlowerStem, quantities: FlowerQuantities) {
  return flower.availability === "AVAILABLE" ? clampFlowerQuantity(quantities[flower.id]) : 0;
}

export function calculateBouquetPricing(
  flowers: readonly FlowerStem[],
  quantities: FlowerQuantities,
  wrappingType: WrappingType,
  wrappingVariant: WrappingVariant,
) {
  const flowerSubtotal = flowers.reduce((total, flower) => (
    total + flower.pricePerStem * getSelectableQuantity(flower, quantities)
  ), 0);
  const totalStemCount = flowers.reduce((total, flower) => (
    total + getSelectableQuantity(flower, quantities)
  ), 0);
  const wrappingPrice = wrappingType.priceModifier
    + wrappingVariant.priceModifier
    + (wrappingType.compatibilityPriceModifiers[wrappingVariant.id] ?? 0);

  return {
    flowerSubtotal,
    wrappingPrice,
    totalStemCount,
    totalPrice: flowerSubtotal + wrappingPrice,
  };
}

export function createBouquetResult(
  flowers: readonly FlowerStem[],
  quantities: FlowerQuantities,
  wrappingType: WrappingType,
  wrappingVariant: WrappingVariant,
): BouquetBuilderResult {
  const pricing = calculateBouquetPricing(flowers, quantities, wrappingType, wrappingVariant);
  return {
    type: "CUSTOM_BOUQUET",
    version: 2,
    flowers: flowers
      .filter((flower) => getSelectableQuantity(flower, quantities) > 0)
      .map((flower) => ({
        flowerId: flower.id,
        flowerCode: flower.stableCode,
        quantity: getSelectableQuantity(flower, quantities),
        unitPrice: flower.pricePerStem,
      })),
    wrapping: {
      typeId: wrappingType.id,
      typeCode: wrappingType.stableCode,
      variantId: wrappingVariant.id,
      variantCode: wrappingVariant.stableCode,
      priceModifier: pricing.wrappingPrice,
    },
    totalStemCount: pricing.totalStemCount,
    totalPrice: pricing.totalPrice,
  };
}
