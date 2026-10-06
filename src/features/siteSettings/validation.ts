import type { SiteProfile } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+]?[0-9][0-9() .-]*$/;
const HANDLE_PATTERN = /^@[A-Za-z0-9._]{1,30}$/;

export type SiteProfileErrorCode =
  | "businessName"
  | "phone"
  | "email"
  | "instagramUrl"
  | "instagramHandle"
  | "instagramPair";

export type SiteProfileErrors = Partial<Record<keyof SiteProfile, SiteProfileErrorCode>>;

export function normalizePhoneHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 7 || trimmed.length > 30 || !PHONE_PATTERN.test(trimmed)) return null;
  const normalized = trimmed.replace(/[^0-9+]/g, "");
  return /^\+?[0-9]{7,15}$/.test(normalized) ? `tel:${normalized}` : null;
}

export function isSafeInstagramUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && (hostname === "instagram.com" || hostname === "www.instagram.com")
      && /^\/[A-Za-z0-9._-]+\/?$/.test(url.pathname) && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function validateSiteProfile(profile: SiteProfile): SiteProfileErrors {
  const errors: SiteProfileErrors = {};
  const name = profile.businessName.trim();
  const email = profile.email.trim();
  const handle = profile.instagramHandle.trim();
  if (name.length < 2 || name.length > 120) errors.businessName = "businessName";
  if (profile.phone.trim() && !normalizePhoneHref(profile.phone)) errors.phone = "phone";
  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) errors.email = "email";
  if (!isSafeInstagramUrl(profile.instagramUrl)) errors.instagramUrl = "instagramUrl";
  if (handle && !HANDLE_PATTERN.test(handle)) errors.instagramHandle = "instagramHandle";
  if (Boolean(profile.instagramUrl.trim()) !== Boolean(handle)) errors.instagramHandle = "instagramPair";
  return errors;
}
