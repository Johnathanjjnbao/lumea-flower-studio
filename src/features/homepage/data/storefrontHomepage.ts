import type { Locale } from "../../../types/content";
import { loadPublishedCatalog } from "../../catalog/data/storefrontCatalog";
import { homepageSectionKeys, type HomepageContent } from "../types";
import { createSupabaseHomepageRepository } from "./supabaseHomepageRepository";

const CACHE_TTL_MS = 10_000;
const repository = createSupabaseHomepageRepository();
const cache = new Map<Locale, { expiresAt: number; promise: Promise<HomepageContent> }>();

export function loadHomepageContent(locale: Locale, force = false) {
  const cached = cache.get(locale);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = Promise.all([
    repository.getHomepageSections(locale),
    loadPublishedCatalog(locale, force),
  ]).then(([sectionList, products]) => {
    const sections = Object.fromEntries(homepageSectionKeys.map((key) => [key, null])) as HomepageContent["sections"];
    sectionList.forEach((section) => { sections[section.key] = section; });
    const curatedIds = sections.best_sellers?.curatedProductIds ?? [];
    const productById = new Map(products.map((product) => [product.id, product]));
    return {
      sections,
      featuredProducts: curatedIds.map((id) => productById.get(id)).filter((product): product is NonNullable<typeof product> => Boolean(product)),
    };
  });
  cache.set(locale, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  void promise.catch(() => cache.delete(locale));
  return promise;
}

export function invalidateHomepageCache() {
  cache.clear();
}
