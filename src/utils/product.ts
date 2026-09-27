import type { CatalogProductRecord, CatalogVariantRecord } from "../features/catalog/data/catalogRepository";

export function formatVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

export function getProductPrice(product: CatalogProductRecord, variantId: string) {
  const selectedVariant = product.variants.find((variant) => variant.id === variantId) ?? product.variants[0];
  return selectedVariant?.priceAmount ?? product.startingPriceAmount;
}

export function getVariantPriceLabel(product: CatalogProductRecord, variant: CatalogVariantRecord) {
  if (variant.priceAmount === product.startingPriceAmount) return formatVnd(variant.priceAmount);
  return `+${formatVnd(variant.priceAmount - product.startingPriceAmount)}`;
}
