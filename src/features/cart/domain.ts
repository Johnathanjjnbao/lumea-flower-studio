import type { BouquetBuilderCatalog, BouquetBuilderResult } from "../bouquetBuilder/types";
import { calculateBouquetPricing } from "../bouquetBuilder/pricing.ts";
import type { CatalogProductRecord } from "../catalog/data/catalogRepository";
import { MAX_CART_ITEM_QUANTITY, type CartItem, type CartLine, type CustomBouquetCartItem, type ReadyMadeCartItem } from "./types.ts";

export function clampCartQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, Math.trunc(value)));
}

export function readyMadeCartIdentity(productId: string, variantId: string, toneCode: string | null) {
  return `ready:${productId}:${variantId}:${toneCode ?? "none"}`;
}

export function customBouquetConfigurationKey(result: {
  flowers: ReadonlyArray<{ flowerCode: string; quantity: number }>;
  wrapping: { typeCode: string; variantCode: string };
}) {
  const flowers = [...result.flowers]
    .map((flower) => `${flower.flowerCode}:${flower.quantity}`)
    .sort()
    .join("|");
  return `${flowers}::${result.wrapping.typeCode}:${result.wrapping.variantCode}`;
}

export function createReadyMadeCartItem(
  product: CatalogProductRecord,
  variantId: string,
  toneCode: string | null,
  quantity: number,
): ReadyMadeCartItem | null {
  if (product.availability === "UNAVAILABLE") return null;
  const variant = product.variants.find((option) => option.id === variantId);
  const tone = toneCode ? product.tones.find((option) => option.stableCode === toneCode) : null;
  if (!variant || (product.tones.length > 0 && !tone)) return null;
  const primaryImage = product.images.find((image) => image.role === "PRIMARY") ?? product.images[0];
  return {
    id: readyMadeCartIdentity(product.id, variant.id, tone?.stableCode ?? null),
    type: "READY_MADE_PRODUCT",
    productId: product.id,
    productCode: product.stableCode,
    productSlug: product.slug,
    variantId: variant.id,
    variantCode: variant.stableCode,
    toneCode: tone?.stableCode ?? null,
    quantity: clampCartQuantity(quantity),
    unitPriceSnapshot: variant.priceAmount,
    addedAt: new Date().toISOString(),
    display: {
      productName: product.name,
      variantName: variant.name,
      toneName: tone?.name ?? null,
      imageUrl: primaryImage?.url ?? null,
      imageAlt: primaryImage?.altText ?? product.name,
    },
  };
}

export function createCustomBouquetCartItem(
  result: BouquetBuilderResult,
  catalog: BouquetBuilderCatalog,
  quantity = 1,
): CustomBouquetCartItem | null {
  const selectedFlowers = result.flowers.map((selection) => {
    const flower = catalog.flowers.find((option) => option.id === selection.flowerId || option.stableCode === selection.flowerCode);
    return flower && flower.availability !== "UNAVAILABLE" && selection.quantity > 0
      ? { flower, quantity: selection.quantity }
      : null;
  });
  if (selectedFlowers.length === 0 || selectedFlowers.some((selection) => !selection)) return null;
  const wrappingType = catalog.wrappingTypes.find((option) => option.id === result.wrapping.typeId || option.stableCode === result.wrapping.typeCode);
  const wrappingVariant = catalog.wrappingVariants.find((option) => option.id === result.wrapping.variantId || option.stableCode === result.wrapping.variantCode);
  if (!wrappingType || !wrappingVariant || !wrappingType.compatibleVariantIds.includes(wrappingVariant.id)) return null;
  const flowerQuantities = Object.fromEntries(selectedFlowers.map((selection) => [selection!.flower.id, selection!.quantity]));
  const pricing = calculateBouquetPricing(catalog.flowers, flowerQuantities, wrappingType, wrappingVariant);
  if (pricing.totalStemCount < 1) return null;
  const configurationKey = customBouquetConfigurationKey(result);
  return {
    id: `custom:${configurationKey}`,
    type: "CUSTOM_BOUQUET",
    configurationKey,
    quantity: clampCartQuantity(quantity),
    unitPriceSnapshot: pricing.totalPrice,
    addedAt: new Date().toISOString(),
    flowers: selectedFlowers.map((selection) => ({
      flowerId: selection!.flower.id,
      flowerCode: selection!.flower.stableCode,
      quantity: selection!.quantity,
      name: selection!.flower.name,
      imageUrl: selection!.flower.imageUrl,
      imageAlt: selection!.flower.imageAlt,
    })),
    wrapping: {
      typeId: wrappingType.id,
      typeCode: wrappingType.stableCode,
      typeName: wrappingType.name,
      variantId: wrappingVariant.id,
      variantCode: wrappingVariant.stableCode,
      variantName: wrappingVariant.name,
      swatch: wrappingVariant.swatch,
    },
    totalStemCount: pricing.totalStemCount,
  };
}

export function mergeCartItem(lines: readonly CartLine[], item: CartItem): CartLine[] {
  const existing = lines.find((line) => line.id === item.id && line.type === item.type);
  if (!existing) return [...lines, { ...item, validation: { state: "valid" } }];
  return lines.map((line) => line.id === item.id
    ? {
        ...line,
        ...item,
        addedAt: line.addedAt,
        quantity: clampCartQuantity(line.quantity + item.quantity),
        validation: { state: "valid" },
      }
    : line);
}

export function setCartLineQuantity(lines: readonly CartLine[], itemId: string, quantity: number) {
  return lines.map((line) => line.id === itemId ? { ...line, quantity: clampCartQuantity(quantity) } : line);
}

export function removeCartLine(lines: readonly CartLine[], itemId: string) {
  return lines.filter((line) => line.id !== itemId);
}

export function getCartItemCount(lines: readonly Pick<CartItem, "quantity">[]) {
  return lines.reduce((total, line) => total + clampCartQuantity(line.quantity), 0);
}

export function getCartSubtotal(lines: readonly CartLine[]) {
  return lines.reduce((total, line) => (
    line.validation.state === "valid" || line.validation.state === "changed"
      ? total + line.unitPriceSnapshot * line.quantity
      : total
  ), 0);
}
