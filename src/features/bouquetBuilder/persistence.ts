import { clampFlowerQuantity } from "./pricing.ts";
import type { BouquetBuilderCatalog, FlowerQuantities } from "./types.ts";

export const BOUQUET_DRAFT_STORAGE_KEY = "lumea.bouquet-builder.draft";
export const BOUQUET_DRAFT_VERSION = 2;

interface BouquetBuilderDraft {
  version: typeof BOUQUET_DRAFT_VERSION;
  quantities: Record<string, number>;
  wrapping: { typeCode: string; variantCode: string };
}

export interface RestoredBouquetDraft {
  quantities: FlowerQuantities;
  wrappingTypeId: string;
  wrappingVariantId: string;
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBrowserStorage(): DraftStorage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function getBuilderDefaults(catalog: BouquetBuilderCatalog) {
  const wrappingType = catalog.wrappingTypes[0];
  const wrappingVariant = catalog.wrappingVariants.find((variant) => wrappingType?.compatibleVariantIds.includes(variant.id));
  return { wrappingTypeId: wrappingType?.id ?? "", wrappingVariantId: wrappingVariant?.id ?? "" };
}

export function createInitialFlowerQuantities(catalog: BouquetBuilderCatalog): FlowerQuantities {
  return Object.fromEntries(catalog.flowers.map((flower) => [flower.id, 0]));
}

export function restoreBouquetDraft(rawDraft: string | null, catalog: BouquetBuilderCatalog): RestoredBouquetDraft | null {
  if (!rawDraft) return null;
  try {
    const parsed: unknown = JSON.parse(rawDraft);
    if (!isRecord(parsed) || parsed.version !== BOUQUET_DRAFT_VERSION) return null;
    const quantities = createInitialFlowerQuantities(catalog);
    const rawQuantities = isRecord(parsed.quantities) ? parsed.quantities : {};
    catalog.flowers.forEach((flower) => {
      const rawQuantity = rawQuantities[flower.stableCode];
      if (flower.availability !== "UNAVAILABLE" && typeof rawQuantity === "number") quantities[flower.id] = clampFlowerQuantity(rawQuantity);
    });
    const defaults = getBuilderDefaults(catalog);
    const rawWrapping = isRecord(parsed.wrapping) ? parsed.wrapping : {};
    const wrappingType = catalog.wrappingTypes.find((option) => option.stableCode === rawWrapping.typeCode)
      ?? catalog.wrappingTypes.find((option) => option.id === defaults.wrappingTypeId)
      ?? catalog.wrappingTypes[0];
    if (!wrappingType) return null;
    const requestedVariant = catalog.wrappingVariants.find((variant) => variant.stableCode === rawWrapping.variantCode);
    const wrappingVariant = requestedVariant && wrappingType.compatibleVariantIds.includes(requestedVariant.id)
      ? requestedVariant
      : catalog.wrappingVariants.find((variant) => wrappingType.compatibleVariantIds.includes(variant.id));
    if (!wrappingVariant) return null;
    return { quantities, wrappingTypeId: wrappingType.id, wrappingVariantId: wrappingVariant.id };
  } catch { return null; }
}

export function createBouquetDraft(
  catalog: BouquetBuilderCatalog,
  quantities: FlowerQuantities,
  wrappingTypeId: string,
  wrappingVariantId: string,
): BouquetBuilderDraft {
  const wrappingType = catalog.wrappingTypes.find((option) => option.id === wrappingTypeId) ?? catalog.wrappingTypes[0];
  const wrappingVariant = catalog.wrappingVariants.find((option) => option.id === wrappingVariantId)
    ?? catalog.wrappingVariants.find((option) => wrappingType?.compatibleVariantIds.includes(option.id));
  return {
    version: BOUQUET_DRAFT_VERSION,
    quantities: Object.fromEntries(catalog.flowers
      .filter((flower) => flower.availability !== "UNAVAILABLE")
      .map((flower) => [flower.stableCode, clampFlowerQuantity(quantities[flower.id])] as const)
      .filter(([, quantity]) => quantity > 0)),
    wrapping: { typeCode: wrappingType?.stableCode ?? "", variantCode: wrappingVariant?.stableCode ?? "" },
  };
}

export function readBouquetDraft(catalog: BouquetBuilderCatalog, storage: DraftStorage | null = getBrowserStorage()) {
  if (!storage) return null;
  try { return restoreBouquetDraft(storage.getItem(BOUQUET_DRAFT_STORAGE_KEY), catalog); } catch { return null; }
}

export function writeBouquetDraft(
  catalog: BouquetBuilderCatalog,
  quantities: FlowerQuantities,
  wrappingTypeId: string,
  wrappingVariantId: string,
  storage: DraftStorage | null = getBrowserStorage(),
) {
  if (!storage) return;
  try { storage.setItem(BOUQUET_DRAFT_STORAGE_KEY, JSON.stringify(createBouquetDraft(catalog, quantities, wrappingTypeId, wrappingVariantId))); } catch { /* Best effort. */ }
}

export function clearBouquetDraft(storage: DraftStorage | null = getBrowserStorage()) {
  if (!storage) return;
  try { storage.removeItem(BOUQUET_DRAFT_STORAGE_KEY); } catch { /* Best effort. */ }
}

export function isDefaultBouquetDraft(catalog: BouquetBuilderCatalog, quantities: FlowerQuantities, wrappingTypeId: string, wrappingVariantId: string) {
  const defaults = getBuilderDefaults(catalog);
  return catalog.flowers.every((flower) => clampFlowerQuantity(quantities[flower.id]) === 0)
    && wrappingTypeId === defaults.wrappingTypeId && wrappingVariantId === defaults.wrappingVariantId;
}
