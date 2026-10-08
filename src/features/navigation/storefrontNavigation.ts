import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient } from "../../lib/supabase";
import type { Locale } from "../../types/content";
import { navigationDestinationPath, type NavigationDestinationType, type StorefrontNavigationItem } from "./types";

const CACHE_TTL_MS = 10_000;
const cache = new Map<Locale, { expiresAt: number; promise: Promise<StorefrontNavigationItem[]> }>();

async function requestNavigation(locale: Locale, client: SupabaseClient<any>): Promise<StorefrontNavigationItem[]> {
  const { data, error } = await client
    .from("navigation_items")
    .select("id, stable_code, destination_type, external_url, sort_order, categories(slug), navigation_item_translations(locale, label)")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(`Unable to load storefront navigation (${error.code}).`);
  return (data ?? []).map((row: any) => {
    const translation = row.navigation_item_translations.find((value: any) => value.locale === locale)
      ?? row.navigation_item_translations.find((value: any) => value.locale === "vi");
    const destinationType = row.destination_type as NavigationDestinationType;
    const categorySlug = row.categories?.slug ?? null;
    const to = navigationDestinationPath(destinationType, categorySlug, row.external_url);
    if (!translation?.label || !to) return null;
    return {
      id: row.id,
      stableCode: row.stable_code,
      label: translation.label,
      destinationType,
      categorySlug,
      externalUrl: row.external_url,
      sortOrder: row.sort_order,
      to,
      external: destinationType === "EXTERNAL",
    } satisfies StorefrontNavigationItem;
  }).filter((item): item is StorefrontNavigationItem => Boolean(item));
}

export function loadStorefrontNavigation(locale: Locale, force = false) {
  const cached = cache.get(locale);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = Promise.resolve().then(() => requestNavigation(locale, requirePublicSupabaseClient() as SupabaseClient<any>));
  cache.set(locale, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  void promise.catch(() => cache.delete(locale));
  return promise;
}

export function invalidateStorefrontNavigation() {
  cache.clear();
}
