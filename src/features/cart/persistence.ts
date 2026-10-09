import { customBouquetConfigurationKey } from "./domain.ts";
import type { CartItem, CustomBouquetCartItem, ReadyMadeCartItem } from "./types";

export const CART_STORAGE_KEY = "lumea.cart.v1";
export const CART_PERSISTENCE_VERSION = 1;
const MAX_PERSISTED_ITEMS = 100;

type CartStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, maxLength = 300) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}

function nullableString(value: unknown, maxLength = 300) {
  return value === null ? null : safeString(value, maxLength);
}

function safePrice(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function safeCartQuantity(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 20 ? value : null;
}

function safeSlug(value: unknown) {
  const text = safeString(value);
  return text && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text) ? text : null;
}

function safeDate(value: unknown) {
  const text = safeString(value, 40);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

function safeImageUrl(value: unknown) {
  if (value === null) return null;
  const text = safeString(value, 2048);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? text : null;
  } catch { return null; }
}

function parseReadyMade(value: Record<string, unknown>): ReadyMadeCartItem | null {
  const display = isRecord(value.display) ? value.display : null;
  const productId = safeString(value.productId);
  const productCode = safeString(value.productCode);
  const productSlug = safeSlug(value.productSlug);
  const variantId = safeString(value.variantId);
  const variantCode = safeString(value.variantCode);
  const sku = nullableString(value.sku, 96);
  const toneCode = nullableString(value.toneCode);
  const price = safePrice(value.unitPriceSnapshot);
  const quantity = safeCartQuantity(value.quantity);
  const addedAt = safeDate(value.addedAt);
  const productName = display && safeString(display.productName);
  const variantName = display && safeString(display.variantName);
  const toneName = display && nullableString(display.toneName);
  const imageUrl = display && safeImageUrl(display.imageUrl);
  const imageAlt = display && safeString(display.imageAlt);
  if (!productId || !productCode || !productSlug || !variantId || !variantCode || quantity === null || price === null || !addedAt || !productName || !variantName || !imageAlt || (toneCode && !toneName)) return null;
  return {
    id: `ready:${productId}:${variantId}:${toneCode ?? "none"}`,
    type: "READY_MADE_PRODUCT",
    productId, productCode, productSlug, variantId, variantCode, sku, toneCode,
    quantity, unitPriceSnapshot: price, addedAt,
    display: { productName, variantName, toneName, imageUrl, imageAlt },
  };
}

function parseCustomBouquet(value: Record<string, unknown>): CustomBouquetCartItem | null {
  if (!Array.isArray(value.flowers) || value.flowers.length < 1 || value.flowers.length > 50 || !isRecord(value.wrapping)) return null;
  const flowers = value.flowers.map((raw) => {
    if (!isRecord(raw)) return null;
    const flowerId = safeString(raw.flowerId);
    const flowerCode = safeString(raw.flowerCode);
    const name = safeString(raw.name);
    const imageUrl = safeImageUrl(raw.imageUrl);
    const imageAlt = safeString(raw.imageAlt);
    const quantity = Number(raw.quantity);
    if (!flowerId || !flowerCode || !name || !imageUrl || !imageAlt || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return null;
    return { flowerId, flowerCode, name, imageUrl, imageAlt, quantity };
  });
  if (flowers.some((flower) => !flower)) return null;
  const validFlowers = flowers as CustomBouquetCartItem["flowers"];
  if (new Set(validFlowers.map((flower) => flower.flowerCode)).size !== validFlowers.length) return null;
  const wrapping = value.wrapping;
  const typeId = safeString(wrapping.typeId);
  const typeCode = safeString(wrapping.typeCode);
  const typeName = safeString(wrapping.typeName);
  const variantId = safeString(wrapping.variantId);
  const variantCode = safeString(wrapping.variantCode);
  const variantName = safeString(wrapping.variantName);
  const swatch = safeString(wrapping.swatch, 100);
  const price = safePrice(value.unitPriceSnapshot);
  const quantity = safeCartQuantity(value.quantity);
  const addedAt = safeDate(value.addedAt);
  if (!typeId || !typeCode || !typeName || !variantId || !variantCode || !variantName || !swatch || quantity === null || price === null || !addedAt) return null;
  const configurationKey = customBouquetConfigurationKey({ flowers: validFlowers, wrapping: { typeCode, variantCode } });
  const totalStemCount = validFlowers.reduce((total, flower) => total + flower.quantity, 0);
  return {
    id: `custom:${configurationKey}`,
    type: "CUSTOM_BOUQUET",
    configurationKey,
    quantity, unitPriceSnapshot: price, addedAt,
    flowers: validFlowers,
    wrapping: { typeId, typeCode, typeName, variantId, variantCode, variantName, swatch },
    totalStemCount,
  };
}

export function restoreCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== CART_PERSISTENCE_VERSION || !Array.isArray(parsed.items)) return [];
    return parsed.items.slice(0, MAX_PERSISTED_ITEMS).map((value) => {
      if (!isRecord(value)) return null;
      if (value.type === "READY_MADE_PRODUCT") return parseReadyMade(value);
      if (value.type === "CUSTOM_BOUQUET") return parseCustomBouquet(value);
      return null;
    }).filter((item): item is CartItem => Boolean(item));
  } catch { return []; }
}

function getBrowserStorage(): CartStorage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function readCart(storage: CartStorage | null = getBrowserStorage()) {
  if (!storage) return [];
  try { return restoreCart(storage.getItem(CART_STORAGE_KEY)); } catch { return []; }
}

export function writeCart(items: readonly CartItem[], storage: CartStorage | null = getBrowserStorage()) {
  if (!storage) return;
  try { storage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: CART_PERSISTENCE_VERSION, items })); } catch { /* Keep in-memory cart when storage is unavailable. */ }
}

export function clearPersistedCart(storage: CartStorage | null = getBrowserStorage()) {
  if (!storage) return;
  try { storage.removeItem(CART_STORAGE_KEY); } catch { /* Nothing else to clear. */ }
}
