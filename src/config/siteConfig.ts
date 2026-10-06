import type { HomeChapterId, NavigationItem } from "../types/content";

export const siteConfig = {
  brandName: "LUMÉA",
  monogram: "L",
  currency: "VND",
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
