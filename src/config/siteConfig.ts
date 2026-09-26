import type { HomeChapterId, NavigationItem } from "../types/content";

export const siteConfig = {
  brandName: "LUMÉA",
  brandDisplayName: "Luméa",
  monogram: "L",
  phoneDisplay: "0900 000 000",
  phoneHref: "tel:0900000000",
  email: "hello@lumea.flowers",
  instagramHandle: "@lumeaflowers",
  currency: "VND",
  year: 2026,
  navigation: [
    { key: "flowers", to: "/flowers" },
    { key: "occasions", to: "/#occasions" },
    { key: "custom", to: "/create-bouquet" },
    { key: "sameDay", to: "/#same-day" },
    { key: "about", to: "/#why-lumea" },
    { key: "visit", to: "/#visit" },
  ] satisfies NavigationItem[],
  homeChapters: ["top", "occasions", "best-sellers", "budget", "same-day", "florist-choice", "custom", "why-lumea", "gallery", "visit"] satisfies HomeChapterId[],
} as const;
