import {
  defaultWrappingTypeId,
  defaultWrappingVariantId,
  flowerStems,
  initialFlowerQuantities,
  wrappingTypes,
  wrappingVariants,
} from "./data.ts";
import { clampFlowerQuantity } from "./pricing.ts";
import type { FlowerQuantities, FlowerStemId, WrappingTypeId, WrappingVariantId } from "./types.ts";

export const BOUQUET_DRAFT_STORAGE_KEY = "lumea.bouquet-builder.draft";
export const BOUQUET_DRAFT_VERSION = 1;

interface BouquetBuilderDraft {
  version: typeof BOUQUET_DRAFT_VERSION;
  quantities: Partial<Record<FlowerStemId, number>>;
  wrapping: {
    typeId: WrappingTypeId;
    variantId: WrappingVariantId;
  };
}

export interface RestoredBouquetDraft {
  quantities: FlowerQuantities;
  wrappingTypeId: WrappingTypeId;
  wrappingVariantId: WrappingVariantId;
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBrowserStorage(): DraftStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function restoreBouquetDraft(rawDraft: string | null): RestoredBouquetDraft | null {
  if (!rawDraft) return null;

  try {
    const parsed: unknown = JSON.parse(rawDraft);
    if (!isRecord(parsed) || parsed.version !== BOUQUET_DRAFT_VERSION) return null;

    const quantities = { ...initialFlowerQuantities };
    const rawQuantities = isRecord(parsed.quantities) ? parsed.quantities : {};
    flowerStems.forEach((flower) => {
      const rawQuantity = rawQuantities[flower.id];
      if (flower.availability === "UNAVAILABLE" || typeof rawQuantity !== "number") return;
      quantities[flower.id] = clampFlowerQuantity(rawQuantity);
    });

    const rawWrapping = isRecord(parsed.wrapping) ? parsed.wrapping : {};
    const wrappingType = wrappingTypes.find((option) => option.id === rawWrapping.typeId)
      ?? wrappingTypes.find((option) => option.id === defaultWrappingTypeId)
      ?? wrappingTypes[0];
    const requestedVariant = wrappingVariants.find((option) => option.id === rawWrapping.variantId);
    const wrappingVariant = requestedVariant && wrappingType.compatibleVariantIds.includes(requestedVariant.id)
      ? requestedVariant
      : wrappingVariants.find((option) => option.id === wrappingType.compatibleVariantIds[0])
        ?? wrappingVariants.find((option) => option.id === defaultWrappingVariantId)
        ?? wrappingVariants[0];

    return {
      quantities,
      wrappingTypeId: wrappingType.id,
      wrappingVariantId: wrappingVariant.id,
    };
  } catch {
    return null;
  }
}

export function createBouquetDraft(
  quantities: FlowerQuantities,
  wrappingTypeId: WrappingTypeId,
  wrappingVariantId: WrappingVariantId,
): BouquetBuilderDraft {
  const selectedQuantities = Object.fromEntries(
    flowerStems
      .filter((flower) => flower.availability !== "UNAVAILABLE")
      .map((flower) => [flower.id, clampFlowerQuantity(quantities[flower.id])] as const)
      .filter(([, quantity]) => quantity > 0),
  ) as Partial<Record<FlowerStemId, number>>;

  return {
    version: BOUQUET_DRAFT_VERSION,
    quantities: selectedQuantities,
    wrapping: { typeId: wrappingTypeId, variantId: wrappingVariantId },
  };
}

export function readBouquetDraft(storage: DraftStorage | null = getBrowserStorage()) {
  if (!storage) return null;
  try {
    return restoreBouquetDraft(storage.getItem(BOUQUET_DRAFT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeBouquetDraft(
  quantities: FlowerQuantities,
  wrappingTypeId: WrappingTypeId,
  wrappingVariantId: WrappingVariantId,
  storage: DraftStorage | null = getBrowserStorage(),
) {
  if (!storage) return;
  try {
    storage.setItem(
      BOUQUET_DRAFT_STORAGE_KEY,
      JSON.stringify(createBouquetDraft(quantities, wrappingTypeId, wrappingVariantId)),
    );
  } catch {
    // Storage can be unavailable or full; the builder remains fully usable in memory.
  }
}

export function clearBouquetDraft(storage: DraftStorage | null = getBrowserStorage()) {
  if (!storage) return;
  try {
    storage.removeItem(BOUQUET_DRAFT_STORAGE_KEY);
  } catch {
    // Reset still clears in-memory state when storage access is unavailable.
  }
}

export function isDefaultBouquetDraft(
  quantities: FlowerQuantities,
  wrappingTypeId: WrappingTypeId,
  wrappingVariantId: WrappingVariantId,
) {
  return flowerStems.every((flower) => clampFlowerQuantity(quantities[flower.id]) === 0)
    && wrappingTypeId === defaultWrappingTypeId
    && wrappingVariantId === defaultWrappingVariantId;
}
