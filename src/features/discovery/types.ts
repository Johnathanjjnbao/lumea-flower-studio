export interface DiscoveryOccasion {
  id: string;
  stableCode: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface DiscoveryBudgetRange {
  id: string;
  stableCode: string;
  minAmount: number;
  maxAmount: number | null;
  scaleLabel: string;
  label: string;
  description: string;
  sortOrder: number;
}

export interface DiscoveryOptions {
  occasions: DiscoveryOccasion[];
  budgetRanges: DiscoveryBudgetRange[];
}
