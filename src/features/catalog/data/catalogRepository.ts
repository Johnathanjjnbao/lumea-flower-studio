import type { Locale, ProductAvailability } from "../../../types/content";

export type CatalogProductType = "READY_MADE_BOUQUET" | "FLORIST_CHOICE" | "CUSTOM_BOUQUET";

export interface CatalogVariantRecord {
  id: string;
  stableCode: string;
  sku: string;
  name: string;
  description: string | null;
  priceAmount: number;
  sortOrder: number;
}

export interface CatalogCategoryRecord {
  id: string;
  stableCode: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface CatalogMediaRecord {
  id: string;
  url: string;
  altText: string;
  caption: string | null;
  role: "PRIMARY" | "GALLERY";
  sortOrder: number;
}

export interface CatalogToneRecord {
  stableCode: string;
  name: string;
  swatchValue: string | null;
  sortOrder: number;
}

export interface CatalogOccasionRecord {
  stableCode: string;
  name: string;
  sortOrder: number;
}

export interface CatalogProductRecord {
  id: string;
  stableCode: string;
  slug: string;
  productType: CatalogProductType;
  availability: ProductAvailability;
  sameDayEligible: boolean;
  featured: boolean;
  bestseller: boolean;
  sortOrder: number;
  name: string;
  shortDescription: string | null;
  description: string | null;
  composition: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  startingPriceAmount: number;
  category: CatalogCategoryRecord;
  variants: CatalogVariantRecord[];
  images: CatalogMediaRecord[];
  occasionCodes: string[];
  occasions: CatalogOccasionRecord[];
  tones: CatalogToneRecord[];
}

export interface CatalogProductFilters {
  availability?: ProductAvailability;
  categoryCode?: string;
  occasionCode?: string;
  sameDayEligible?: boolean;
}

export interface CatalogRepository {
  listPublishedCategories(locale: Locale): Promise<CatalogCategoryRecord[]>;
  listPublishedProducts(
    locale: Locale,
    filters?: CatalogProductFilters,
  ): Promise<CatalogProductRecord[]>;
  getPublishedProductBySlug(slug: string, locale: Locale): Promise<CatalogProductRecord | null>;
}
