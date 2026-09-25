import type { AssetKey } from "../data/assets";

export interface NavigationItem {
  label: string;
  href: `#${string}`;
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
  name: string;
  category: string;
  description: string;
  price: string;
  image: AssetKey;
  alt: string;
  tag?: string;
  tagTone?: "light";
  imageTone?: "quiet";
}

export interface BudgetRange {
  id: string;
  scale: string;
  label: string;
  note: string;
  image: AssetKey;
  alt: string;
}
