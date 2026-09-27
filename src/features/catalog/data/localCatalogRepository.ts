import { assets } from "../../../data/assets";
import { products } from "../../../data/content";
import { ko } from "../../../i18n/ko";
import { vi } from "../../../i18n/vi";
import type { Locale } from "../../../types/content";
import type {
  CatalogProductFilters,
  CatalogProductRecord,
  CatalogRepository,
} from "./catalogRepository";

const dictionaries = { vi, ko } as const;

function matchesFilters(product: CatalogProductRecord, filters?: CatalogProductFilters) {
  if (!filters) return true;
  if (filters.availability && product.availability !== filters.availability) return false;
  if (filters.sameDayEligible !== undefined && product.sameDayEligible !== filters.sameDayEligible) return false;
  if (filters.occasionCode && !product.occasionCodes.includes(filters.occasionCode)) return false;
  return true;
}

function mapLocalProducts(locale: Locale): CatalogProductRecord[] {
  const dictionary = dictionaries[locale];

  return products.map((product, productIndex) => {
    const copy = dictionary.products[product.id];
    const variants = product.sizes.map((size, variantIndex) => ({
      id: `${product.id}:${size.id}`,
      stableCode: size.id,
      name: dictionary.product.sizes[size.id].label,
      description: dictionary.product.sizes[size.id].description,
      priceAmount: product.basePrice + size.priceDelta,
      sortOrder: variantIndex,
    }));

    return {
      id: product.id,
      stableCode: product.id,
      slug: product.slug,
      productType: "READY_MADE_BOUQUET",
      availability: product.availability,
      sameDayEligible: product.sameDayEligible,
      featured: product.featured ?? false,
      bestseller: product.tag === "bestseller",
      sortOrder: productIndex,
      name: product.name,
      shortDescription: copy.shortDescription,
      description: copy.description,
      composition: [...copy.composition],
      seoTitle: null,
      seoDescription: null,
      startingPriceAmount: Math.min(...variants.map((variant) => variant.priceAmount)),
      variants,
      images: product.images.map((image, imageIndex) => ({
        id: `${product.id}:image:${imageIndex}`,
        url: assets[image.asset],
        altText: copy.imageAlts[imageIndex] ?? copy.imageAlts[0],
        caption: null,
        role: imageIndex === 0 ? "PRIMARY" : "GALLERY",
        sortOrder: imageIndex,
      })),
      occasionCodes: [...product.occasionIds],
      occasions: product.occasionIds.map((occasionCode, occasionIndex) => ({
        stableCode: occasionCode,
        name: dictionary.occasions[occasionCode].name,
        sortOrder: occasionIndex,
      })),
      tones: product.tones.map((tone, toneIndex) => ({
        stableCode: tone.id,
        name: dictionary.product.tones[tone.id],
        swatchValue: tone.swatch,
        sortOrder: toneIndex,
      })),
    } satisfies CatalogProductRecord;
  });
}

export class LocalCatalogRepository implements CatalogRepository {
  async listPublishedProducts(locale: Locale, filters?: CatalogProductFilters) {
    return mapLocalProducts(locale).filter((product) => matchesFilters(product, filters));
  }

  async getPublishedProductBySlug(slug: string, locale: Locale) {
    return mapLocalProducts(locale).find((product) => product.slug === slug) ?? null;
  }
}

export const localCatalogRepository = new LocalCatalogRepository();
