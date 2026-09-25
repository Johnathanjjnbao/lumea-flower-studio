import type { Occasion, Product, ProductAvailability } from "../types/content";

export type CatalogBudgetId = "under-500" | "500-800" | "800-1200" | "over-1200";
export type CatalogAvailabilityId = "available" | "seasonal";

export interface CatalogDiscoveryState {
  query: string;
  occasion: string | null;
  budget: CatalogBudgetId | null;
  sameDay: boolean;
  availability: CatalogAvailabilityId | null;
}

export const budgetFilterOptions: ReadonlyArray<{ id: CatalogBudgetId; label: string }> = [
  { id: "under-500", label: "Dưới 500k" },
  { id: "500-800", label: "500–800k" },
  { id: "800-1200", label: "800k–1.2m" },
  { id: "over-1200", label: "Trên 1.2m" },
];

export const availabilityFilterOptions: ReadonlyArray<{
  id: CatalogAvailabilityId;
  label: string;
  value: ProductAvailability;
}> = [
  { id: "available", label: "Có thể đặt", value: "AVAILABLE" },
  { id: "seasonal", label: "Hoa theo mùa", value: "SEASONAL" },
];

const budgetIds = new Set<CatalogBudgetId>(budgetFilterOptions.map((option) => option.id));
const availabilityIds = new Set<CatalogAvailabilityId>(availabilityFilterOptions.map((option) => option.id));

export function getRepresentedOccasions(productList: Product[], occasionList: Occasion[]) {
  return occasionList.filter((occasion) => productList.some((product) => product.occasions.includes(occasion.name)));
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

export function normalizeCatalogSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi-VN")
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
  occasionList: Occasion[],
) {
  const normalizedQuery = normalizeCatalogSearch(state.query);
  const selectedOccasion = occasionList.find((occasion) => occasion.id === state.occasion);
  const selectedAvailability = availabilityFilterOptions.find((option) => option.id === state.availability);

  return productList.filter((product) => {
    if (normalizedQuery) {
      const searchableText = normalizeCatalogSearch([
        product.name,
        product.category,
        product.shortDescription,
        ...product.composition,
        ...product.occasions,
      ].join(" "));
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    if (selectedOccasion && !product.occasions.includes(selectedOccasion.name)) return false;
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
