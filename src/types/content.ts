import type { AssetKey } from "../data/assets";

export type Locale = "vi" | "ko";
export type NavigationKey = "flowers" | "occasions" | "custom" | "sameDay" | "about" | "visit";
export type HomeChapterId = "top" | "occasions" | "best-sellers" | "budget" | "same-day" | "florist-choice" | "custom" | "why-lumea" | "gallery" | "visit";
export type OccasionId = "birthday" | "love" | "congrats" | "graduation" | "opening" | "sympathy";
export type ProductId = "pink-garden" | "morning-peony" | "white-poetry" | "warm-embrace" | "rose-letter" | "amber-afternoon" | "hydrangea-cloud" | "spring-note" | "velvet-promise" | "quiet-calla";
export type ProductTag = "bestseller" | "seasonal" | "sameDay" | "studioEdit";
export type ProductAvailability = "AVAILABLE" | "UNAVAILABLE" | "SEASONAL";
export type ProductSizeId = "standard" | "large" | "premium";
export type ProductToneId = "pastel" | "pink" | "white" | "warm" | "florist-choice";
export type BudgetRangeId = "small" | "medium" | "large" | "statement";

export interface NavigationItem { key: NavigationKey; to: string; }
export interface Occasion { id: OccasionId; image: AssetKey; tone?: "quiet"; }
export interface ProductImage { asset: AssetKey; }
export interface ProductSize { id: ProductSizeId; priceDelta: number; }
export interface ProductTone { id: ProductToneId; swatch: string; }
export interface BudgetRange { id: BudgetRangeId; image: AssetKey; }

export interface Product {
  id: ProductId;
  slug: ProductId;
  name: string;
  basePrice: number;
  images: ProductImage[];
  occasionIds: OccasionId[];
  availability: ProductAvailability;
  sameDayEligible: boolean;
  sizes: ProductSize[];
  tones: ProductTone[];
  tag?: ProductTag;
  tagTone?: "light";
  imageTone?: "quiet";
  featured?: boolean;
}
