import type { Occasion, Product, ProductAvailability } from "../types/content";
import type { Locale, OccasionId } from "../types/content";
import type { Translations } from "../i18n";

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

export function getRepresentedOccasions(productList: Product[], occasionList: Occasion[]) {
  return occasionList.filter((occasion) => productList.some((product) => product.occasionIds.includes(occasion.id)));
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
  productList: Product[],
  state: CatalogDiscoveryState,
  t: Translations,
  locale: Locale,
) {
  const normalizedQuery = normalizeCatalogSearch(state.query, locale);
  const selectedAvailability = availabilityFilterOptions.find((option) => option.id === state.availability);

  return productList.filter((product) => {
    if (normalizedQuery) {
      const copy = t.products[product.id];
      const searchableText = normalizeCatalogSearch([
        product.name,
        copy.category,
        copy.shortDescription,
        copy.description,
        ...copy.composition,
        ...product.occasionIds.map((id) => t.occasions[id].name),
      ].join(" "), locale);
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    if (state.occasion && !product.occasionIds.includes(state.occasion as OccasionId)) return false;
    if (state.budget && !matchesBudget(product.basePrice, state.budget)) return false;
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
