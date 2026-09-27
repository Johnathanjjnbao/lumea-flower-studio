import type { ProductAvailability } from "../types/content";
import type { Locale } from "../types/content";
import type { CatalogProductRecord } from "../features/catalog/data/catalogRepository";

export type CatalogBudgetId = "under-500" | "500-800" | "800-1200" | "over-1200";
export type CatalogAvailabilityId = "available" | "seasonal";

export interface CatalogDiscoveryState {
  query: string;
  occasion: string | null;
  budget: CatalogBudgetId | null;
  sameDay: boolean;
  availability: CatalogAvailabilityId | null;
}

export const budgetFilterOptions: ReadonlyArray<{ id: CatalogBudgetId }> = [
  { id: "under-500" }, { id: "500-800" }, { id: "800-1200" }, { id: "over-1200" },
];

export const availabilityFilterOptions: ReadonlyArray<{
  id: CatalogAvailabilityId;
  value: ProductAvailability;
}> = [
  { id: "available", value: "AVAILABLE" },
  { id: "seasonal", value: "SEASONAL" },
];

const budgetIds = new Set<CatalogBudgetId>(budgetFilterOptions.map((option) => option.id));
const availabilityIds = new Set<CatalogAvailabilityId>(availabilityFilterOptions.map((option) => option.id));

export function getRepresentedOccasions(productList: CatalogProductRecord[]) {
  const represented = new Map<string, CatalogProductRecord["occasions"][number]>();
  productList.flatMap((product) => product.occasions).forEach((occasion) => {
    if (!represented.has(occasion.stableCode)) represented.set(occasion.stableCode, occasion);
  });
  return [...represented.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function readCatalogDiscoveryState(searchParams: URLSearchParams, validOccasionIds: Set<string>): CatalogDiscoveryState {
  const occasion = searchParams.get("occasion");
  const budget = searchParams.get("budget") as CatalogBudgetId | null;
  const availability = searchParams.get("availability") as CatalogAvailabilityId | null;

  return {
    query: searchParams.get("q") ?? "",
    occasion: occasion && validOccasionIds.has(occasion) ? occasion : null,
    budget: budget && budgetIds.has(budget) ? budget : null,
    sameDay: searchParams.get("sameDay") === "true",
    availability: availability && availabilityIds.has(availability) ? availability : null,
  };
}

export function normalizeCatalogSearch(value: string, locale: Locale = "vi") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase(locale === "ko" ? "ko-KR" : "vi-VN")
    .trim();
}

function matchesBudget(price: number, budget: CatalogBudgetId) {
  if (budget === "under-500") return price < 500_000;
  if (budget === "500-800") return price >= 500_000 && price < 800_000;
  if (budget === "800-1200") return price >= 800_000 && price <= 1_200_000;
  return price > 1_200_000;
}

export function filterCatalogProducts(
  productList: CatalogProductRecord[],
  state: CatalogDiscoveryState,
  locale: Locale,
) {
  const normalizedQuery = normalizeCatalogSearch(state.query, locale);
  const selectedAvailability = availabilityFilterOptions.find((option) => option.id === state.availability);

  return productList.filter((product) => {
    if (normalizedQuery) {
      const searchableText = normalizeCatalogSearch([
        product.name,
        product.stableCode,
        product.slug,
        product.shortDescription ?? "",
        product.description ?? "",
        ...product.composition,
        ...product.occasions.map((occasion) => occasion.name),
      ].join(" "), locale);
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    if (state.occasion && !product.occasionCodes.includes(state.occasion)) return false;
    if (state.budget && !matchesBudget(product.startingPriceAmount, state.budget)) return false;
    if (state.sameDay && !product.sameDayEligible) return false;
    if (selectedAvailability && product.availability !== selectedAvailability.value) return false;
    return true;
  });
}

export const budgetParamByRangeId: Record<string, CatalogBudgetId> = {
  small: "under-500",
  medium: "500-800",
  large: "800-1200",
  statement: "over-1200",
};
