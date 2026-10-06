import type { Locale } from "../../types/content";
import { DiscoveryRepository } from "./repository";
import type { DiscoveryOptions } from "./types";

const CACHE_TTL_MS = 10_000;
const repository = new DiscoveryRepository();
const cache = new Map<Locale, { expiresAt: number; promise: Promise<DiscoveryOptions> }>();

export function loadDiscoveryOptions(locale: Locale, force = false) {
  const cached = cache.get(locale);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = repository.getOptions(locale);
  cache.set(locale, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  void promise.catch(() => cache.delete(locale));
  return promise;
}

export function invalidateDiscoveryOptions() { cache.clear(); }
