import type { CatalogProductRecord } from "../catalog/data/catalogRepository";
import type { DiscoveryBudgetRange, DiscoveryOccasion } from "../discovery/types";

export const homepageSectionKeys = [
  "hero",
  "occasions",
  "best_sellers",
  "budget",
  "same_day",
  "florist_choice",
  "create_bouquet",
  "why_lumea",
  "gallery",
  "visit",
] as const;

export type HomepageSectionKey = (typeof homepageSectionKeys)[number];

export interface HomepageSectionCopy {
  eyebrow: string;
  titleOne: string;
  titleTwo: string;
  body: string;
  note: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  secondaryHeading: string;
  secondaryBody: string;
  detailOneLabel: string;
  detailOneValue: string;
  detailTwoLabel: string;
  detailTwoValue: string;
}

export interface HomepageVisitSettings {
  mapEnabled: boolean;
  mapQuery: string;
  googleMapsUrl: string;
}

export interface HomepageMedia {
  id: string;
  mediaAssetId: string;
  slotKey: string;
  url: string;
  altText: string;
  caption: string;
  sortOrder: number;
  active: boolean;
}

export interface HomepageFeatureItem {
  id: string;
  itemKey: string;
  label: string;
  title: string;
  body: string;
  media: HomepageMedia | null;
  sortOrder: number;
  active: boolean;
}

export interface HomepageSection {
  id: string;
  key: HomepageSectionKey;
  enabled: boolean;
  primaryCtaTarget: string | null;
  secondaryCtaTarget: string | null;
  visit: HomepageVisitSettings;
  copy: HomepageSectionCopy;
  media: HomepageMedia[];
  features: HomepageFeatureItem[];
  curatedProductIds: string[];
}

export function emptyHomepageVisitSettings(): HomepageVisitSettings {
  return { mapEnabled: false, mapQuery: "", googleMapsUrl: "" };
}

export interface HomepageContent {
  sections: Record<HomepageSectionKey, HomepageSection | null>;
  featuredProducts: CatalogProductRecord[];
  occasions: DiscoveryOccasion[];
  budgetRanges: DiscoveryBudgetRange[];
}

export function emptyHomepageCopy(): HomepageSectionCopy {
  return {
    eyebrow: "",
    titleOne: "",
    titleTwo: "",
    body: "",
    note: "",
    primaryCtaLabel: "",
    secondaryCtaLabel: "",
    secondaryHeading: "",
    secondaryBody: "",
    detailOneLabel: "",
    detailOneValue: "",
    detailTwoLabel: "",
    detailTwoValue: "",
  };
}

export function mediaBySlot(section: HomepageSection, slotKey: string) {
  return section.media.find((media) => media.slotKey === slotKey && media.active) ?? null;
}
