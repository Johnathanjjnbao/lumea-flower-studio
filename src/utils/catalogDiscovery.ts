import type { ProductAvailability } from "../types/content";
import type { Locale } from "../types/content";
import type { CatalogProductRecord } from "../features/catalog/data/catalogRepository";
import type { DiscoveryBudgetRange } from "../features/discovery/types";

export type CatalogAvailabilityId = "available" | "seasonal";

export interface CatalogDiscoveryState {
  query: string;
  category: string | null;
  occasion: string | null;
  budget: string | null;
  sameDay: boolean;
  availability: CatalogAvailabilityId | null;
}
export const availabilityFilterOptions: ReadonlyArray<{
  id: CatalogAvailabilityId;
  value: ProductAvailability;
}> = [
  { id: "available", value: "AVAILABLE" },
  { id: "seasonal", value: "SEASONAL" },
];

const availabilityIds = new Set<CatalogAvailabilityId>(availabilityFilterOptions.map((option) => option.id));

export function getRepresentedOccasions(productList: CatalogProductRecord[]) {
  const represented = new Map<string, CatalogProductRecord["occasions"][number]>();
  productList.flatMap((product) => product.occasions).forEach((occasion) => {
    if (!represented.has(occasion.stableCode)) represented.set(occasion.stableCode, occasion);
  });
  return [...represented.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function readCatalogDiscoveryState(searchParams: URLSearchParams, validOccasionIds: Set<string>, validBudgetIds: Set<string>, validCategoryIds: Set<string> = new Set()): CatalogDiscoveryState {
  const occasion = searchParams.get("occasion");
  const category = searchParams.get("category");
  const budget = searchParams.get("budget");
  const availability = searchParams.get("availability") as CatalogAvailabilityId | null;

  return {
    query: searchParams.get("q") ?? "",
    category: category && validCategoryIds.has(category) ? category : null,
    occasion: occasion && validOccasionIds.has(occasion) ? occasion : null,
    budget: budget && validBudgetIds.has(budget) ? budget : null,
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

function matchesBudget(price: number, budget: DiscoveryBudgetRange) {
  return price >= budget.minAmount && (budget.maxAmount === null || price <= budget.maxAmount);
}

export function filterCatalogProducts(
  productList: CatalogProductRecord[],
  state: CatalogDiscoveryState,
  locale: Locale,
  budgetRanges: DiscoveryBudgetRange[],
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
        product.category.name,
        ...product.composition,
        ...product.occasions.map((occasion) => occasion.name),
      ].join(" "), locale);
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    if (state.occasion && !product.occasionCodes.includes(state.occasion)) return false;
    if (state.category && product.category.slug !== state.category && product.category.stableCode !== state.category) return false;
    const budget = budgetRanges.find((range) => range.stableCode === state.budget);
    if (state.budget && (!budget || !matchesBudget(product.startingPriceAmount, budget))) return false;
    if (state.sameDay && !product.sameDayEligible) return false;
    if (selectedAvailability && product.availability !== selectedAvailability.value) return false;
    return true;
  });
}
