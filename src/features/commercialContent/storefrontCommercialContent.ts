import type { Locale } from "../../types/content";
import { createCommercialContentRepository } from "./repository";
import type { PublishedCommercialContent } from "./types";
import { reviewMode } from "../../review/mode";
import { getReviewPolicies } from "../../review/fixtures";

const CACHE_TTL_MS = 10_000;
const repository = reviewMode ? null : createCommercialContentRepository();
const cache = new Map<Locale, { expiresAt: number; promise: Promise<PublishedCommercialContent[]> }>();

export function loadPublishedCommercialContent(locale: Locale, force = false) {
  if (reviewMode) return Promise.resolve(getReviewPolicies(locale));
  const cached = cache.get(locale);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.promise;
  const promise = repository!.listPublished(locale);
  cache.set(locale, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  void promise.catch(() => cache.delete(locale));
  return promise;
}

export function invalidateCommercialContentCache() {
  cache.clear();
}
