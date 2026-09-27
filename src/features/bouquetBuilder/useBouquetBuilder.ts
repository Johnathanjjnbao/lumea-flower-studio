import { useEffect, useMemo, useState } from "react";
import { clearBouquetDraft, createInitialFlowerQuantities, getBuilderDefaults, isDefaultBouquetDraft, readBouquetDraft, writeBouquetDraft } from "./persistence";
import { calculateBouquetPricing, clampFlowerQuantity, createBouquetResult } from "./pricing";
import type { BouquetBuilderCatalog, BouquetBuilderResult, FlowerQuantities, FlowerStemId, WrappingTypeId, WrappingVariantId } from "./types";

export function useBouquetBuilder(catalog: BouquetBuilderCatalog) {
  const [initialDraft] = useState(() => readBouquetDraft(catalog));
  const defaults = useMemo(() => getBuilderDefaults(catalog), [catalog]);
  const [quantities, setQuantities] = useState<FlowerQuantities>(() => initialDraft?.quantities ?? createInitialFlowerQuantities(catalog));
  const [wrappingTypeId, setWrappingTypeId] = useState<WrappingTypeId>(() => initialDraft?.wrappingTypeId ?? defaults.wrappingTypeId);
  const [wrappingVariantId, setWrappingVariantId] = useState<WrappingVariantId>(() => initialDraft?.wrappingVariantId ?? defaults.wrappingVariantId);
  const [completedResult, setCompletedResult] = useState<BouquetBuilderResult | null>(null);

  const wrappingType = catalog.wrappingTypes.find((option) => option.id === wrappingTypeId) ?? catalog.wrappingTypes[0];
  const compatibleVariants = useMemo(
    () => catalog.wrappingVariants.filter((option) => wrappingType?.compatibleVariantIds.includes(option.id)),
    [catalog.wrappingVariants, wrappingType],
  );
  const wrappingVariant = compatibleVariants.find((option) => option.id === wrappingVariantId) ?? compatibleVariants[0];
  const selectedFlowers = useMemo(() => catalog.flowers.filter((flower) => (quantities[flower.id] ?? 0) > 0), [catalog.flowers, quantities]);
  const pricing = useMemo(
    () => calculateBouquetPricing(catalog.flowers, quantities, wrappingType, wrappingVariant),
    [catalog.flowers, quantities, wrappingType, wrappingVariant],
  );

  useEffect(() => {
    setQuantities((current) => Object.fromEntries(catalog.flowers.map((flower) => [
      flower.id,
      flower.availability === "UNAVAILABLE" ? 0 : clampFlowerQuantity(current[flower.id] ?? 0),
    ])));
    if (!catalog.wrappingTypes.some((option) => option.id === wrappingTypeId)) setWrappingTypeId(defaults.wrappingTypeId);
    if (!compatibleVariants.some((option) => option.id === wrappingVariantId)) setWrappingVariantId(compatibleVariants[0]?.id ?? defaults.wrappingVariantId);
    setCompletedResult(null);
  }, [catalog.flowers, catalog.wrappingTypes, compatibleVariants, defaults.wrappingTypeId, defaults.wrappingVariantId, wrappingTypeId, wrappingVariantId]);

  useEffect(() => {
    if (isDefaultBouquetDraft(catalog, quantities, wrappingTypeId, wrappingVariantId)) clearBouquetDraft();
    else writeBouquetDraft(catalog, quantities, wrappingTypeId, wrappingVariantId);
  }, [catalog, quantities, wrappingTypeId, wrappingVariantId]);

  const setQuantity = (flowerId: FlowerStemId, nextQuantity: number) => {
    const flower = catalog.flowers.find((option) => option.id === flowerId);
    if (!flower || flower.availability === "UNAVAILABLE") return;
    setCompletedResult(null);
    setQuantities((current) => ({ ...current, [flowerId]: clampFlowerQuantity(nextQuantity) }));
  };

  const selectWrappingType = (nextTypeId: WrappingTypeId) => {
    const nextType = catalog.wrappingTypes.find((option) => option.id === nextTypeId);
    if (!nextType) return;
    setCompletedResult(null);
    setWrappingTypeId(nextTypeId);
    if (!nextType.compatibleVariantIds.includes(wrappingVariantId)) setWrappingVariantId(nextType.compatibleVariantIds[0] ?? "");
  };

  const selectWrappingVariant = (nextVariantId: WrappingVariantId) => {
    if (!wrappingType.compatibleVariantIds.includes(nextVariantId)) return;
    setCompletedResult(null);
    setWrappingVariantId(nextVariantId);
  };

  const reset = () => {
    clearBouquetDraft();
    setQuantities(createInitialFlowerQuantities(catalog));
    setWrappingTypeId(defaults.wrappingTypeId);
    setWrappingVariantId(defaults.wrappingVariantId);
    setCompletedResult(null);
  };

  const complete = () => {
    if (pricing.totalStemCount < 1) return null;
    const result = createBouquetResult(catalog.flowers, quantities, wrappingType, wrappingVariant);
    setCompletedResult(result);
    return result;
  };

  return {
    quantities, selectedFlowers, wrappingType, wrappingVariant, compatibleVariants, pricing,
    isValid: pricing.totalStemCount > 0, completedResult, setQuantity, selectWrappingType,
    selectWrappingVariant, reset, edit: () => setCompletedResult(null), complete,
  };
}
