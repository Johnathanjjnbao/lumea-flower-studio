export const TURNSTILE_ACTION = "checkout_submit";
export const PRODUCTION_HOSTNAME = "johnathanjjnbao.github.io";
export const PRODUCTION_ORIGIN = "https://johnathanjjnbao.github.io";
export const MAX_REQUEST_BYTES = 64 * 1024;
export const LOCAL_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

export type PublicErrorCode =
  | "INVALID_REQUEST"
  | "VERIFICATION_REQUIRED"
  | "VERIFICATION_FAILED"
  | "VERIFICATION_EXPIRED"
  | "VERIFICATION_UNAVAILABLE"
  | "RATE_LIMITED"
  | "REVIEW_CHANGED"
  | "ITEM_UNAVAILABLE"
  | "FULFILLMENT_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "ORDER_UNAVAILABLE";

export interface CheckoutGatewayRequest {
  request: {
    payload: unknown;
    idempotency_key: string;
    reviewed_subtotal: number;
  };
  turnstile_token: string;
}

export interface SiteverifyResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function allowedOrigin(origin: string | null, testMode: boolean) {
  return origin === PRODUCTION_ORIGIN || (testMode && origin !== null && LOCAL_ORIGINS.has(origin));
}

export function parseGatewayRequest(value: unknown): CheckoutGatewayRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (Object.keys(source).some((key) => key !== "request" && key !== "turnstile_token")) return null;
  if (!source.request || typeof source.request !== "object" || Array.isArray(source.request)) return null;
  const request = source.request as Record<string, unknown>;
  if (Object.keys(request).some((key) => !["payload", "idempotency_key", "reviewed_subtotal"].includes(key))) return null;
  if (!isUuid(request.idempotency_key) || !Number.isSafeInteger(request.reviewed_subtotal) || (request.reviewed_subtotal as number) < 0) return null;
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) return null;
  if (typeof source.turnstile_token !== "string" || source.turnstile_token.length > 2048) return null;
  return {
    request: {
      payload: request.payload,
      idempotency_key: request.idempotency_key,
      reviewed_subtotal: request.reviewed_subtotal as number,
    },
    turnstile_token: source.turnstile_token,
  };
}

export async function readJsonBody(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) return null;
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { return null; }
}

export function serverObservedIp(headers: Headers, testMode: boolean) {
  const edgeIp = headers.get("cf-connecting-ip")?.trim();
  if (edgeIp && edgeIp.length <= 64) return edgeIp;
  if (edgeIp) return null;
  if (!testMode) return null;
  const localIp = headers.get("x-real-ip")?.trim();
  return localIp && localIp.length <= 64 ? localIp : "local-test-client";
}

export async function hmacIdentifier(ip: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function evaluateSiteverify(result: SiteverifyResponse, expectedHostname: string) {
  if (!result.success) {
    const expired = result["error-codes"]?.includes("timeout-or-duplicate") ?? false;
    return { ok: false as const, code: expired ? "VERIFICATION_EXPIRED" as const : "VERIFICATION_FAILED" as const };
  }
  if (result.hostname !== expectedHostname || result.action !== TURNSTILE_ACTION) {
    return { ok: false as const, code: "VERIFICATION_FAILED" as const };
  }
  return { ok: true as const };
}

export function classifyOrderError(message: string): PublicErrorCode {
  if (message.includes("CHECKOUT_REVIEW_CHANGED") || message.includes("CHECKOUT_DELIVERY_REVIEW_CHANGED")) return "REVIEW_CHANGED";
  if (message.includes("UNAVAILABLE")) {
    if (message.includes("ITEM") || message.includes("FLOWER") || message.includes("WRAPPING")) return "ITEM_UNAVAILABLE";
    return "FULFILLMENT_UNAVAILABLE";
  }
  if (message.includes("CHECKOUT_IDEMPOTENCY_REUSED")) return "IDEMPOTENCY_CONFLICT";
  if (message.includes("CHECKOUT_") || message.includes("invalid input syntax")) return "INVALID_REQUEST";
  return "ORDER_UNAVAILABLE";
}
