import type { AssetKey } from "../data/assets";

export interface NavigationItem {
  label: string;
  to: string;
}

export interface Occasion {
  id: string;
  name: string;
  image: AssetKey;
  alt: string;
  tone?: "quiet";
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  basePrice: number;
  images: ProductImage[];
  composition: string[];
  occasions: string[];
  availability: ProductAvailability;
  sameDayEligible: boolean;
  sizes: ProductSize[];
  tones: ProductTone[];
  tag?: string;
  tagTone?: "light";
  imageTone?: "quiet";
}

export type ProductAvailability = "AVAILABLE" | "UNAVAILABLE" | "SEASONAL";

export interface ProductImage {
  asset: AssetKey;
  alt: string;
}

export interface ProductSize {
  id: "standard" | "large" | "premium";
  label: string;
  priceDelta: number;
  description: string;
}

export interface ProductTone {
  id: "pastel" | "pink" | "white" | "warm" | "florist-choice";
  label: string;
  swatch: string;
}

export interface BudgetRange {
  id: string;
  scale: string;
  label: string;
  note: string;
  image: AssetKey;
  alt: string;
}
