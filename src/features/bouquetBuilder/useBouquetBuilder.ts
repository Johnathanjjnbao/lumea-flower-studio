import { useMemo, useState } from "react";
import { defaultWrappingTypeId, defaultWrappingVariantId, flowerStems, initialFlowerQuantities, wrappingTypes, wrappingVariants } from "./data";
import { calculateBouquetPricing, clampFlowerQuantity, createBouquetResult } from "./pricing";
import type { BouquetBuilderResult, FlowerQuantities, FlowerStemId, WrappingTypeId, WrappingVariantId } from "./types";

export function useBouquetBuilder() {
  const [quantities, setQuantities] = useState<FlowerQuantities>({ ...initialFlowerQuantities });
  const [wrappingTypeId, setWrappingTypeId] = useState<WrappingTypeId>(defaultWrappingTypeId);
  const [wrappingVariantId, setWrappingVariantId] = useState<WrappingVariantId>(defaultWrappingVariantId);
  const [completedResult, setCompletedResult] = useState<BouquetBuilderResult | null>(null);

  const wrappingType = wrappingTypes.find((option) => option.id === wrappingTypeId) ?? wrappingTypes[0];
  const wrappingVariant = wrappingVariants.find((option) => option.id === wrappingVariantId) ?? wrappingVariants[0];
  const selectedFlowers = useMemo(() => flowerStems.filter((flower) => quantities[flower.id] > 0), [quantities]);
  const pricing = useMemo(
    () => calculateBouquetPricing(flowerStems, quantities, wrappingType, wrappingVariant),
    [quantities, wrappingType, wrappingVariant],
  );

  const setQuantity = (flowerId: FlowerStemId, nextQuantity: number) => {
    const flower = flowerStems.find((option) => option.id === flowerId);
    if (!flower || flower.availability === "UNAVAILABLE") return;
    setCompletedResult(null);
    setQuantities((current) => ({ ...current, [flowerId]: clampFlowerQuantity(nextQuantity) }));
  };

  const selectWrappingType = (nextTypeId: WrappingTypeId) => {
    const nextType = wrappingTypes.find((option) => option.id === nextTypeId);
    if (!nextType) return;
    setCompletedResult(null);
    setWrappingTypeId(nextTypeId);
    if (!nextType.compatibleVariantIds.includes(wrappingVariantId)) {
      setWrappingVariantId(nextType.compatibleVariantIds[0]);
    }
  };

  const selectWrappingVariant = (nextVariantId: WrappingVariantId) => {
    if (!wrappingType.compatibleVariantIds.includes(nextVariantId)) return;
    setCompletedResult(null);
    setWrappingVariantId(nextVariantId);
  };

  const reset = () => {
    setQuantities({ ...initialFlowerQuantities });
    setWrappingTypeId(defaultWrappingTypeId);
    setWrappingVariantId(defaultWrappingVariantId);
    setCompletedResult(null);
  };

  const complete = () => {
    if (pricing.totalStemCount < 1) return null;
    const result = createBouquetResult(flowerStems, quantities, wrappingType, wrappingVariant);
    setCompletedResult(result);
    return result;
  };

  return {
    quantities,
    selectedFlowers,
    wrappingType,
    wrappingVariant,
    compatibleVariants: wrappingVariants.filter((option) => wrappingType.compatibleVariantIds.includes(option.id)),
    pricing,
    isValid: pricing.totalStemCount > 0,
    completedResult,
    setQuantity,
    selectWrappingType,
    selectWrappingVariant,
    reset,
    complete,
  };
}
