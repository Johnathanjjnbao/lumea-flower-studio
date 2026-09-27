import type { Locale } from "../../../types/content";
import type { CatalogProductRecord } from "./catalogRepository";
import { createSupabaseCatalogRepository } from "./supabaseCatalogRepository";

const CACHE_TTL_MS = 10_000;
const repository = createSupabaseCatalogRepository();

interface CacheEntry<T> {
  expiresAt: number;
  promise: Promise<T>;
}

const listCache = new Map<Locale, CacheEntry<CatalogProductRecord[]>>();
const detailCache = new Map<string, CacheEntry<CatalogProductRecord | null>>();

function readCache<T>(entry: CacheEntry<T> | undefined) {
  return entry && entry.expiresAt > Date.now() ? entry.promise : null;
}

export function loadPublishedCatalog(locale: Locale, force = false) {
  const cached = force ? null : readCache(listCache.get(locale));
  if (cached) return cached;

  const promise = repository.listPublishedProducts(locale);
  listCache.set(locale, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  void promise.catch(() => listCache.delete(locale));
  return promise;
}

export function loadPublishedProduct(slug: string, locale: Locale, force = false) {
  const key = `${locale}:${slug}`;
  const cached = force ? null : readCache(detailCache.get(key));
  if (cached) return cached;

  const promise = repository.getPublishedProductBySlug(slug, locale);
  detailCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  void promise.catch(() => detailCache.delete(key));
  return promise;
}

export function invalidateCatalogCache() {
  listCache.clear();
  detailCache.clear();
}
