import type { Product, ProductAvailability, ProductSize } from "../types/content";

export const availabilityLabels: Record<ProductAvailability, string> = {
  AVAILABLE: "Có thể đặt",
  SEASONAL: "Hoa theo mùa",
  UNAVAILABLE: "Tạm hết",
};

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
