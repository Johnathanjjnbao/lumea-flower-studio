import type { Locale } from "../../types/content";

export const commercialContentCodes = [
  "DELIVERY",
  "RETURNS_REFUNDS",
  "PAYMENT",
  "CONTACT_INQUIRY",
  "FLOWER_CARE_DEFAULT",
  "FRESHNESS_SUBSTITUTION_DEFAULT",
] as const;

export type CommercialContentCode = (typeof commercialContentCodes)[number];
export type CommercialContentVisibility = "DRAFT" | "PUBLISHED";

export interface CommercialContentCopy {
  title: string;
  summary: string;
  body: string;
}

export interface CommercialContentSection {
  id: string;
  code: CommercialContentCode;
  visibility: CommercialContentVisibility;
  sortOrder: number;
  updatedAt: string;
  vi: CommercialContentCopy;
  ko: CommercialContentCopy;
}

export interface PublishedCommercialContent {
  id: string;
  code: CommercialContentCode;
  sortOrder: number;
  content: CommercialContentCopy | null;
}

export function isCommercialContentCode(value: string): value is CommercialContentCode {
  return (commercialContentCodes as readonly string[]).includes(value);
}

export function emptyCommercialContentCopy(): CommercialContentCopy {
  return { title: "", summary: "", body: "" };
}

export function contentForLocale(section: CommercialContentSection, locale: Locale) {
  return section[locale];
}

export function publishedContentMap(sections: PublishedCommercialContent[]) {
  return new Map(sections.map((section) => [section.code, section.content] as const));
}
