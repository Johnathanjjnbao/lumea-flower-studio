import type { Locale, ProductAvailability } from "../../../types/content";

export type CatalogProductType = "READY_MADE_BOUQUET" | "FLORIST_CHOICE" | "CUSTOM_BOUQUET";

export interface CatalogVariantRecord {
  id: string;
  stableCode: string;
  name: string;
  description: string | null;
  priceAmount: number;
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
  variants: CatalogVariantRecord[];
  images: CatalogMediaRecord[];
  occasionCodes: string[];
  tones: CatalogToneRecord[];
}

export interface CatalogProductFilters {
  availability?: ProductAvailability;
  occasionCode?: string;
  sameDayEligible?: boolean;
}

export interface CatalogRepository {
  listPublishedProducts(
    locale: Locale,
    filters?: CatalogProductFilters,
  ): Promise<CatalogProductRecord[]>;
  getPublishedProductBySlug(slug: string, locale: Locale): Promise<CatalogProductRecord | null>;
}
