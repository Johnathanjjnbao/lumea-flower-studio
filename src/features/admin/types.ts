import type { Database } from "../../types/database.generated";

export type ProductType = Database["public"]["Enums"]["product_type"];
export type VisibilityStatus = Database["public"]["Enums"]["visibility_status"];
export type AvailabilityStatus = Database["public"]["Enums"]["availability_status"];

export interface AdminProfile {
  id: string;
  authUserId: string;
  displayName: string | null;
  role: Database["public"]["Enums"]["admin_role"];
}

export interface LocalizedProductContent {
  name: string;
  shortDescription: string;
  description: string;
  composition: string;
  seoTitle: string;
  seoDescription: string;
}

export interface AdminProductVariant {
  id?: string;
  stableCode: string;
  priceAmount: number | null;
  active: boolean;
  sortOrder: number;
  viName: string;
  koName: string;
}

export interface AdminProductImage {
  id: string;
  mediaAssetId: string;
  url: string;
  storagePath: string;
  role: "PRIMARY" | "GALLERY";
  active: boolean;
  sortOrder: number;
  viAlt: string;
  koAlt: string;
}

export interface AdminProductDraft {
  id?: string;
  stableCode?: string;
  slug: string;
  productType: ProductType;
  visibility: VisibilityStatus;
  availability: AvailabilityStatus;
  sameDayEligible: boolean;
  sortOrder: number;
  vi: LocalizedProductContent;
  ko: LocalizedProductContent;
  variants: AdminProductVariant[];
  occasionIds: string[];
  toneIds: string[];
  images: AdminProductImage[];
  updatedAt?: string;
}

export interface AdminProductListItem {
  id: string;
  slug: string;
  productType: ProductType;
  visibility: VisibilityStatus;
  availability: AvailabilityStatus;
  sameDayEligible: boolean;
  name: string;
  thumbnailUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  updatedAt: string;
}

export interface TaxonomyOption {
  id: string;
  stableCode: string;
  name: string;
  secondaryName: string;
  swatchValue?: string | null;
}

export interface AdminTaxonomy {
  occasions: TaxonomyOption[];
  tones: TaxonomyOption[];
}

export interface AdminProductFilters {
  search?: string;
  visibility?: VisibilityStatus | "ALL";
  availability?: AvailabilityStatus | "ALL";
  productType?: ProductType | "ALL";
}

export function emptyLocalizedContent(): LocalizedProductContent {
  return {
    name: "",
    shortDescription: "",
    description: "",
    composition: "",
    seoTitle: "",
    seoDescription: "",
  };
}

export function emptyAdminProduct(): AdminProductDraft {
  return {
    slug: "",
    productType: "READY_MADE_BOUQUET",
    visibility: "DRAFT",
    availability: "AVAILABLE",
    sameDayEligible: false,
    sortOrder: 0,
    vi: emptyLocalizedContent(),
    ko: emptyLocalizedContent(),
    variants: [],
    occasionIds: [],
    toneIds: [],
    images: [],
  };
}
