export const MAX_CART_ITEM_QUANTITY = 20;

export type CartItemType = "READY_MADE_PRODUCT" | "CUSTOM_BOUQUET";
export type CartValidationState = "unchecked" | "checking" | "valid" | "changed" | "unavailable" | "error";

interface CartItemBase {
  id: string;
  type: CartItemType;
  quantity: number;
  unitPriceSnapshot: number;
  addedAt: string;
}

export interface ReadyMadeCartItem extends CartItemBase {
  type: "READY_MADE_PRODUCT";
  productId: string;
  productCode: string;
  productSlug: string;
  variantId: string;
  variantCode: string;
  toneCode: string | null;
  display: {
    productName: string;
    variantName: string;
    toneName: string | null;
    imageUrl: string | null;
    imageAlt: string;
  };
}

export interface CustomBouquetCartItem extends CartItemBase {
  type: "CUSTOM_BOUQUET";
  configurationKey: string;
  flowers: Array<{
    flowerId: string;
    flowerCode: string;
    quantity: number;
    name: string;
    imageUrl: string;
    imageAlt: string;
  }>;
  wrapping: {
    typeId: string;
    typeCode: string;
    typeName: string;
    variantId: string;
    variantCode: string;
    variantName: string;
    swatch: string;
  };
  totalStemCount: number;
}

export type CartItem = ReadyMadeCartItem | CustomBouquetCartItem;

export type CartLine = CartItem & {
  validation: {
    state: CartValidationState;
    previousUnitPrice?: number;
  };
};
