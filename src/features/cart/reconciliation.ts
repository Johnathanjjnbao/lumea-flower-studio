import { calculateBouquetPricing } from "../bouquetBuilder/pricing.ts";
import type { BouquetBuilderCatalog } from "../bouquetBuilder/types";
import type { CatalogProductRecord } from "../catalog/data/catalogRepository";
import { customBouquetConfigurationKey, readyMadeCartIdentity } from "./domain.ts";
import type { CartItem, CartLine, CustomBouquetCartItem, ReadyMadeCartItem } from "./types";

function unavailable(item: CartItem): CartLine {
  return { ...item, validation: { state: "unavailable" } };
}

function reconcileReadyMade(item: ReadyMadeCartItem, products: readonly CatalogProductRecord[]): CartLine {
  const product = products.find((option) => option.id === item.productId || option.stableCode === item.productCode || option.slug === item.productSlug);
  if (!product || product.availability !== "AVAILABLE") return unavailable(item);
  const variant = product.variants.find((option) => option.id === item.variantId || option.stableCode === item.variantCode);
  const tone = item.toneCode ? product.tones.find((option) => option.stableCode === item.toneCode) : null;
  if (!variant || (product.tones.length > 0 && !tone) || (product.tones.length === 0 && item.toneCode)) return unavailable(item);
  const primaryImage = product.images.find((image) => image.role === "PRIMARY") ?? product.images[0];
  const changed = variant.priceAmount !== item.unitPriceSnapshot;
  return {
    ...item,
    id: readyMadeCartIdentity(product.id, variant.id, tone?.stableCode ?? null),
    productId: product.id,
    productCode: product.stableCode,
    productSlug: product.slug,
    variantId: variant.id,
    variantCode: variant.stableCode,
    sku: variant.sku,
    toneCode: tone?.stableCode ?? null,
    unitPriceSnapshot: variant.priceAmount,
    display: {
      productName: product.name,
      variantName: variant.name,
      toneName: tone?.name ?? null,
      imageUrl: primaryImage?.url ?? null,
      imageAlt: primaryImage?.altText ?? product.name,
    },
    validation: changed ? { state: "changed", previousUnitPrice: item.unitPriceSnapshot } : { state: "valid" },
  };
}

function reconcileCustomBouquet(item: CustomBouquetCartItem, catalog: BouquetBuilderCatalog): CartLine {
  const selectedFlowers = item.flowers.map((selection) => {
    const flower = catalog.flowers.find((option) => option.id === selection.flowerId || option.stableCode === selection.flowerCode);
    return flower && flower.availability === "AVAILABLE" ? { flower, quantity: selection.quantity } : null;
  });
  if (selectedFlowers.some((selection) => !selection)) return unavailable(item);
  const wrappingType = catalog.wrappingTypes.find((option) => option.id === item.wrapping.typeId || option.stableCode === item.wrapping.typeCode);
  const wrappingVariant = catalog.wrappingVariants.find((option) => option.id === item.wrapping.variantId || option.stableCode === item.wrapping.variantCode);
  if (!wrappingType || !wrappingVariant || !wrappingType.compatibleVariantIds.includes(wrappingVariant.id)) return unavailable(item);
  const quantities = Object.fromEntries(selectedFlowers.map((selection) => [selection!.flower.id, selection!.quantity]));
  const pricing = calculateBouquetPricing(catalog.flowers, quantities, wrappingType, wrappingVariant);
  if (pricing.totalStemCount < 1) return unavailable(item);
  const changed = pricing.totalPrice !== item.unitPriceSnapshot;
  const configurationKey = customBouquetConfigurationKey({
    flowers: selectedFlowers.map((selection) => ({ flowerCode: selection!.flower.stableCode, quantity: selection!.quantity })),
    wrapping: { typeCode: wrappingType.stableCode, variantCode: wrappingVariant.stableCode },
  });
  return {
    ...item,
    id: `custom:${configurationKey}`,
    configurationKey,
    unitPriceSnapshot: pricing.totalPrice,
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
    validation: changed ? { state: "changed", previousUnitPrice: item.unitPriceSnapshot } : { state: "valid" },
  };
}

export function reconcileCartItems(
  items: readonly CartItem[],
  products: readonly CatalogProductRecord[],
  builderCatalog: BouquetBuilderCatalog,
): CartLine[] {
  return items.map((item) => item.type === "READY_MADE_PRODUCT"
    ? reconcileReadyMade(item, products)
    : reconcileCustomBouquet(item, builderCatalog));
}
