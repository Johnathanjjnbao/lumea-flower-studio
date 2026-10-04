import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Locale } from "../../../types/content";
import { getSupabaseClient } from "../../../lib/supabase";

export const ADMIN_PASSWORD_MIN_LENGTH = 15;
export const ADMIN_RECOVERY_MARKER_KEY = "lumea.admin.password-recovery.v1";
export const ADMIN_RECOVERY_MARKER_TTL_MS = 60 * 60 * 1000;

export type AdminRecoveryUrlState = "none" | "recovery" | "error";

interface RecoveryMarker {
  version: 1;
  expiresAt: number;
}

function paramsFromHash(hash: string) {
  return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
}

export function getAdminRecoveryUrlState(href: string): AdminRecoveryUrlState {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "none";
  }

  const hash = paramsFromHash(url.hash);
  const value = (key: string) => url.searchParams.get(key) ?? hash.get(key);
  if (value("error") || value("error_code") || value("error_description")) return "error";
  const implicitRecovery = value("type") === "recovery" && Boolean(value("access_token"));
  if (implicitRecovery || value("code")) return "recovery";
  return "none";
}

export function buildAdminRecoveryRedirectUrl(origin: string, baseUrl: string, locale: Locale) {
  const originUrl = new URL(origin);
  const localHost = originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1";
  if (originUrl.protocol !== "https:" && !(originUrl.protocol === "http:" && localHost)) {
    throw new Error("Unsupported recovery origin.");
  }

  const base = new URL(baseUrl, `${originUrl.origin}/`);
  if (base.origin !== originUrl.origin) throw new Error("Recovery base must stay on the current origin.");
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  const localePrefix = locale === "ko" ? "ko/" : "";
  return new URL(`${basePath}${localePrefix}admin/reset-password`, originUrl.origin).toString();
}

export function isValidAdminEmail(value: string) {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateAdminPassword(password: string, confirmation: string) {
  if (!password) return "password-required" as const;
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) return "password-too-short" as const;
  if (!confirmation) return "confirmation-required" as const;
  if (password !== confirmation) return "mismatch" as const;
  return null;
}

export function writeAdminRecoveryMarker(storage: Storage | null, now = Date.now()) {
  if (!storage) return;
  const marker: RecoveryMarker = { version: 1, expiresAt: now + ADMIN_RECOVERY_MARKER_TTL_MS };
  try { storage.setItem(ADMIN_RECOVERY_MARKER_KEY, JSON.stringify(marker)); } catch { /* Recovery still works in the current navigation. */ }
}

export function hasValidAdminRecoveryMarker(storage: Storage | null, now = Date.now()) {
  if (!storage) return false;
  try {
    const raw = storage.getItem(ADMIN_RECOVERY_MARKER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<RecoveryMarker>;
    if (parsed.version !== 1 || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= now) {
      storage.removeItem(ADMIN_RECOVERY_MARKER_KEY);
      return false;
    }
    return true;
  } catch {
    try { storage.removeItem(ADMIN_RECOVERY_MARKER_KEY); } catch { /* Ignore unavailable storage. */ }
    return false;
  }
}

export function clearAdminRecoveryMarker(storage: Storage | null) {
  try { storage?.removeItem(ADMIN_RECOVERY_MARKER_KEY); } catch { /* Ignore unavailable storage. */ }
}

function requireAuthClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("AUTH_CONFIGURATION");
  return client;
}

export async function requestAdminPasswordRecovery(email: string, locale: Locale) {
  const client = requireAuthClient();
  const redirectTo = buildAdminRecoveryRedirectUrl(window.location.origin, import.meta.env.BASE_URL, locale);
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw new Error("RECOVERY_REQUEST_FAILED");
}

export function subscribeToAdminPasswordRecovery(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const client = requireAuthClient();
  return client.auth.onAuthStateChange(callback).data.subscription;
}

export async function getAdminRecoverySession() {
  const client = requireAuthClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error("RECOVERY_SESSION_FAILED");
  return data.session;
}

export async function updateAdminPassword(password: string) {
  const client = requireAuthClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error("PASSWORD_UPDATE_FAILED");
  await client.auth.signOut({ scope: "global" });
}
