import type { Product, ProductSize } from "../types/content";

export function formatVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

export function getProductPrice(product: Product, sizeId: ProductSize["id"]) {
  const selectedSize = product.sizes.find((size) => size.id === sizeId) ?? product.sizes[0];
  return product.basePrice + selectedSize.priceDelta;
}

export function getSizePriceLabel(product: Product, size: ProductSize) {
  if (size.priceDelta === 0) return formatVnd(product.basePrice);
  return `+${formatVnd(size.priceDelta)}`;
}
