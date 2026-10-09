export const navigationDestinationTypes = [
  "HOME",
  "CATALOG",
  "CATEGORY",
  "BUILDER",
  "OCCASIONS",
  "SAME_DAY",
  "ABOUT",
  "VISIT",
  "EXTERNAL",
] as const;

export type NavigationDestinationType = typeof navigationDestinationTypes[number];

export interface StorefrontNavigationItem {
  id: string;
  stableCode: string;
  label: string;
  destinationType: NavigationDestinationType;
  categorySlug: string | null;
  externalUrl: string | null;
  sortOrder: number;
  to: string;
  external: boolean;
}

export function navigationDestinationPath(
  destinationType: NavigationDestinationType,
  categorySlug: string | null,
  externalUrl: string | null,
) {
  switch (destinationType) {
    case "HOME": return "/#top";
    case "CATALOG": return "/flowers";
    case "CATEGORY": return categorySlug ? `/flowers?category=${encodeURIComponent(categorySlug)}` : null;
    case "BUILDER": return "/create-bouquet";
    case "OCCASIONS": return "/#occasions";
    case "SAME_DAY": return "/#same-day";
    case "ABOUT": return "/#why-lumea";
    case "VISIT": return "/#visit";
    case "EXTERNAL": {
      if (!externalUrl) return null;
      try { return new URL(externalUrl).protocol === "https:" ? externalUrl : null; } catch { return null; }
    }
  }
}
