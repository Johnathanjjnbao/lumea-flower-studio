import type { Locale } from "../../types/content";
import type { BouquetBuilderCatalog } from "./types";
import { createSupabaseBuilderRepository } from "./supabaseBuilderRepository";

const CACHE_TTL_MS = 10_000;
const repository = createSupabaseBuilderRepository();
const cache = new Map<Locale, { expiresAt: number; promise: Promise<BouquetBuilderCatalog> }>();

export function loadPublishedBuilder(locale: Locale, force = false) {
  const current = cache.get(locale);
  if (!force && current && current.expiresAt > Date.now()) return current.promise;
  const promise = repository.loadPublishedBuilder(locale);
  cache.set(locale, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  void promise.catch(() => cache.delete(locale));
  return promise;
}

export function invalidateBuilderCache() {
  cache.clear();
}
