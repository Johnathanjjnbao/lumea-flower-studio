import type { CheckoutOrderRequest } from "./types";

const ATTEMPT_STORAGE_KEY = "lumea.checkout.attempt.v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface StoredAttempt {
  version: 1;
  fingerprint: string;
  idempotencyKey: string;
}

function sessionStorageOrNull() {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

function randomUuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function fingerprint(request: CheckoutOrderRequest) {
  const bytes = new TextEncoder().encode(JSON.stringify(request));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function parseAttempt(raw: string | null): StoredAttempt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAttempt>;
    if (value.version !== 1 || typeof value.fingerprint !== "string" || !/^[0-9a-f]{64}$/.test(value.fingerprint)) return null;
    if (typeof value.idempotencyKey !== "string" || !UUID_PATTERN.test(value.idempotencyKey)) return null;
    return value as StoredAttempt;
  } catch { return null; }
}

export async function getCheckoutIdempotencyKey(request: CheckoutOrderRequest) {
  const requestFingerprint = await fingerprint(request);
  const storage = sessionStorageOrNull();
  const existing = parseAttempt(storage?.getItem(ATTEMPT_STORAGE_KEY) ?? null);
  if (existing?.fingerprint === requestFingerprint) return existing.idempotencyKey;
  const idempotencyKey = randomUuid();
  try {
    storage?.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify({ version: 1, fingerprint: requestFingerprint, idempotencyKey } satisfies StoredAttempt));
  } catch { /* In-memory submission guards still prevent a same-page double click. */ }
  return idempotencyKey;
}

export function clearCheckoutAttempt() {
  try { sessionStorageOrNull()?.removeItem(ATTEMPT_STORAGE_KEY); } catch { /* Nothing sensitive needs cleanup. */ }
}
