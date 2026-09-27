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

export interface LocalizedBuilderContent {
  name: string;
  description: string;
}

export interface AdminFlowerImage {
  mediaAssetId: string;
  url: string;
  storagePath: string;
  viAlt: string;
  koAlt: string;
}

export interface AdminFlowerDraft {
  id?: string;
  stableCode: string;
  visibility: VisibilityStatus;
  availability: AvailabilityStatus;
  pricePerStem: number | null;
  seasonalNoteRequired: boolean;
  sortOrder: number;
  vi: LocalizedBuilderContent;
  ko: LocalizedBuilderContent;
  image: AdminFlowerImage | null;
  updatedAt?: string;
}

export interface AdminFlowerListItem {
  id: string;
  stableCode: string;
  name: string;
  visibility: VisibilityStatus;
  availability: AvailabilityStatus;
  pricePerStem: number;
  thumbnailUrl: string | null;
  updatedAt: string;
}

export interface AdminWrappingOptionDraft {
  id?: string;
  stableCode: string;
  visibility: VisibilityStatus;
  priceModifier: number | null;
  sortOrder: number;
  vi: LocalizedBuilderContent;
  ko: LocalizedBuilderContent;
  compatibleVariantIds: string[];
  updatedAt?: string;
}

export interface AdminWrappingVariantDraft {
  id?: string;
  stableCode: string;
  visibility: VisibilityStatus;
  priceModifier: number | null;
  swatch: string;
  sortOrder: number;
  vi: LocalizedBuilderContent;
  ko: LocalizedBuilderContent;
  updatedAt?: string;
}

export function emptyLocalizedBuilderContent(): LocalizedBuilderContent {
  return { name: "", description: "" };
}

export function emptyAdminFlower(): AdminFlowerDraft {
  return {
    stableCode: "",
    visibility: "DRAFT",
    availability: "AVAILABLE",
    pricePerStem: null,
    seasonalNoteRequired: false,
    sortOrder: 0,
    vi: emptyLocalizedBuilderContent(),
    ko: emptyLocalizedBuilderContent(),
    image: null,
  };
}

export function emptyAdminWrappingOption(): AdminWrappingOptionDraft {
  return { stableCode: "", visibility: "DRAFT", priceModifier: 0, sortOrder: 0, vi: emptyLocalizedBuilderContent(), ko: emptyLocalizedBuilderContent(), compatibleVariantIds: [] };
}

export function emptyAdminWrappingVariant(): AdminWrappingVariantDraft {
  return { stableCode: "", visibility: "DRAFT", priceModifier: 0, swatch: "#EEE8DE", sortOrder: 0, vi: emptyLocalizedBuilderContent(), ko: emptyLocalizedBuilderContent() };
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
