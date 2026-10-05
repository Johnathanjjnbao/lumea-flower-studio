import type { HomepageSectionCopy, HomepageVisitSettings } from "./types";

export interface VisitSettingsErrors {
  phone?: string;
  mapQuery?: string;
  googleMapsUrl?: string;
  localizedCopy?: string;
}

const GOOGLE_MAPS_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl"]);

export function isSafeGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || !GOOGLE_MAPS_HOSTS.has(host) || url.username || url.password) return false;
    if (host === "maps.app.goo.gl") return url.pathname.length > 1;
    if (host === "goo.gl") return url.pathname.startsWith("/maps/");
    return url.pathname === "/maps" || url.pathname.startsWith("/maps/");
  } catch {
    return false;
  }
}

export function normalizePhoneHref(value: string) {
  const trimmed = value.trim();
  if (!/^\+?[0-9][0-9() .-]*$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

export function buildGoogleMapsEmbedUrl(query: string) {
  const normalized = query.trim();
  if (normalized.length < 3 || normalized.length > 300) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(normalized)}&output=embed`;
}

export function validateVisitSettings(settings: HomepageVisitSettings, vi?: HomepageSectionCopy, ko?: HomepageSectionCopy): VisitSettingsErrors {
  const errors: VisitSettingsErrors = {};
  const phone = settings.phone.trim();
  const mapQuery = settings.mapQuery.trim();
  const mapsUrl = settings.googleMapsUrl.trim();

  if (phone && !normalizePhoneHref(phone)) errors.phone = "Nhập số điện thoại hợp lệ, từ 7 đến 15 chữ số.";
  if (mapQuery && (mapQuery.length < 3 || mapQuery.length > 300)) errors.mapQuery = "Vị trí bản đồ cần từ 3 đến 300 ký tự.";
  if (mapsUrl && !isSafeGoogleMapsUrl(mapsUrl)) errors.googleMapsUrl = "Dùng liên kết HTTPS từ Google Maps.";
  if (settings.mapEnabled) {
    if (!mapQuery) errors.mapQuery = "Nhập địa chỉ hoặc tên địa điểm để hiển thị bản đồ.";
    if (!mapsUrl) errors.googleMapsUrl = "Nhập liên kết Google Maps cho nút chỉ đường.";
    if (vi && ko && (!vi.primaryCtaLabel.trim() || !ko.primaryCtaLabel.trim())) {
      errors.localizedCopy = "Nhập nhãn nút chỉ đường bằng cả tiếng Việt và tiếng Hàn.";
    }
  }
  return errors;
}
