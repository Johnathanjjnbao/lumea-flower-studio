import type { Json } from "../../../types/database.generated";
import type { CustomBouquetSnapshot, DeliveryStatus, NextOrderStatus, OrderStatus } from "./types";

export const ORDER_PAGE_SIZE = 20;

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "FULFILLING",
  "COMPLETED",
  "CANCELLED",
];

export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly NextOrderStatus[]>> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["FULFILLING", "COMPLETED"],
  FULFILLING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const DELIVERY_TRANSITIONS: Readonly<Record<DeliveryStatus, readonly DeliveryStatus[]>> = {
  PENDING: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["READY_FOR_DISPATCH", "CANCELLED"],
  READY_FOR_DISPATCH: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: ["SCHEDULED", "CANCELLED"],
  CANCELLED: [],
};

export function isAllowedOrderTransition(current: OrderStatus, next: OrderStatus) {
  return next !== "PENDING" && ORDER_TRANSITIONS[current].includes(next);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(source: Record<string, unknown>, key: string) {
  return typeof source[key] === "string" ? source[key] : null;
}

function numberValue(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseCustomBouquetSnapshot(value: Json | null): CustomBouquetSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.flowers) || !isRecord(value.wrapping)) return null;
  const totalStems = numberValue(value, "total_stems");
  if (totalStems === null || !Number.isInteger(totalStems)) return null;

  const flowers = value.flowers.map((entry) => {
    if (!isRecord(entry)) return null;
    const flowerId = stringValue(entry, "flower_id");
    const flowerCode = stringValue(entry, "flower_code");
    const name = stringValue(entry, "name");
    const quantity = numberValue(entry, "quantity");
    const unitPrice = numberValue(entry, "unit_price");
    const lineTotal = numberValue(entry, "line_total");
    if (!flowerId || !flowerCode || !name || quantity === null || !Number.isInteger(quantity) || unitPrice === null || lineTotal === null) return null;
    return { flowerId, flowerCode, name, quantity, unitPrice, lineTotal };
  });
  if (flowers.some((flower) => flower === null)) return null;

  const wrapping = value.wrapping;
  const typeId = stringValue(wrapping, "type_id");
  const typeCode = stringValue(wrapping, "type_code");
  const typeName = stringValue(wrapping, "type_name");
  const variantId = stringValue(wrapping, "variant_id");
  const variantCode = stringValue(wrapping, "variant_code");
  const variantName = stringValue(wrapping, "variant_name");
  const swatch = wrapping.swatch === null || typeof wrapping.swatch === "string" ? wrapping.swatch : null;
  const price = numberValue(wrapping, "price");
  if (!typeId || !typeCode || !typeName || !variantId || !variantCode || !variantName || price === null) return null;

  return {
    flowers: flowers as CustomBouquetSnapshot["flowers"],
    totalStems,
    wrapping: { typeId, typeCode, typeName, variantId, variantCode, variantName, swatch, price },
  };
}

export function orderErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return null;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const known = [
    "ADMIN_ORDERS_FORBIDDEN",
    "ORDER_NOT_FOUND",
    "ORDER_STATUS_CONFLICT",
    "ORDER_STATUS_INVALID_TRANSITION",
    "ORDER_STATUS_INVALID_REQUEST",
    "ORDER_STATUS_REASON_TOO_LONG",
    "PAYMENT_STATUS_CONFLICT",
    "PAYMENT_STATUS_INVALID_TRANSITION",
    "DELIVERY_STATUS_CONFLICT",
    "DELIVERY_STATUS_INVALID_TRANSITION",
  ].find((code) => message.includes(code));
  return known ?? null;
}
