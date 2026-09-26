import type { BudgetRange, Occasion, Product, ProductSize, ProductTone } from "../types/content";

export const occasions: Occasion[] = [
  { id: "birthday", image: "occasionBirthday" },
  { id: "love", image: "occasionLove" },
  { id: "congrats", image: "occasionCongrats" },
  { id: "graduation", image: "occasionGraduation" },
  { id: "opening", image: "occasionOpening" },
  { id: "sympathy", image: "occasionSympathy", tone: "quiet" },
];

const standardSizes: ProductSize[] = [
  { id: "standard", priceDelta: 0 },
  { id: "large", priceDelta: 180000 },
  { id: "premium", priceDelta: 350000 },
];

const tones: Record<ProductTone["id"], ProductTone> = {
  pastel: { id: "pastel", swatch: "#dcc4bd" },
  pink: { id: "pink", swatch: "#c88f9b" },
  white: { id: "white", swatch: "#eee8de" },
  warm: { id: "warm", swatch: "#c78362" },
  "florist-choice": { id: "florist-choice", swatch: "#9ea58f" },
};

export const products: Product[] = [
  { id: "pink-garden", slug: "pink-garden", name: "Pink Garden", basePrice: 650000, images: [{ asset: "productPink" }], occasionIds: ["birthday", "love"], availability: "AVAILABLE", sameDayEligible: true, sizes: standardSizes, tones: [tones.pastel, tones.pink, tones["florist-choice"]], tag: "bestseller", featured: true },
  { id: "morning-peony", slug: "morning-peony", name: "Morning Tulip", basePrice: 820000, images: [{ asset: "productPeony" }], occasionIds: ["birthday", "congrats", "graduation"], availability: "SEASONAL", sameDayEligible: false, sizes: standardSizes, tones: [tones.pastel, tones.white, tones["florist-choice"]] },
  { id: "white-poetry", slug: "white-poetry", name: "White Poetry", basePrice: 720000, images: [{ asset: "productWhite" }], occasionIds: ["congrats", "sympathy"], availability: "SEASONAL", sameDayEligible: true, sizes: standardSizes, tones: [tones.white, tones.pastel, tones["florist-choice"]], tag: "seasonal", tagTone: "light", imageTone: "quiet", featured: true },
  { id: "warm-embrace", slug: "warm-embrace", name: "Warm Embrace", basePrice: 890000, images: [{ asset: "productWarm" }], occasionIds: ["love", "opening"], availability: "AVAILABLE", sameDayEligible: false, sizes: standardSizes, tones: [tones.warm, tones.pink, tones["florist-choice"]], featured: true },
  { id: "rose-letter", slug: "rose-letter", name: "Rose Letter", basePrice: 560000, images: [{ asset: "productRoseLetter" }], occasionIds: ["birthday", "love"], availability: "AVAILABLE", sameDayEligible: true, sizes: standardSizes, tones: [tones.pink, tones.pastel, tones["florist-choice"]], tag: "sameDay", featured: true },
  { id: "amber-afternoon", slug: "amber-afternoon", name: "Amber Afternoon", basePrice: 980000, images: [{ asset: "productAmberStudy" }], occasionIds: ["congrats", "opening"], availability: "AVAILABLE", sameDayEligible: false, sizes: standardSizes, tones: [tones.warm, tones["florist-choice"]] },
  { id: "hydrangea-cloud", slug: "hydrangea-cloud", name: "Hydrangea Cloud", basePrice: 1280000, images: [{ asset: "productHydrangea" }], occasionIds: ["congrats", "opening"], availability: "SEASONAL", sameDayEligible: false, sizes: standardSizes, tones: [tones.warm, tones.white, tones["florist-choice"]], tag: "seasonal", tagTone: "light", featured: true },
  { id: "spring-note", slug: "spring-note", name: "Spring Note", basePrice: 760000, images: [{ asset: "productSpringNote" }], occasionIds: ["birthday", "graduation", "congrats"], availability: "AVAILABLE", sameDayEligible: true, sizes: standardSizes, tones: [tones.pastel, tones.warm, tones["florist-choice"]], featured: true },
  { id: "velvet-promise", slug: "velvet-promise", name: "Velvet Promise", basePrice: 1180000, images: [{ asset: "productVelvet" }], occasionIds: ["love", "congrats"], availability: "SEASONAL", sameDayEligible: false, sizes: standardSizes, tones: [tones.pink, tones.warm, tones["florist-choice"]], tag: "studioEdit" },
  { id: "quiet-calla", slug: "quiet-calla", name: "Quiet Calla", basePrice: 480000, images: [{ asset: "detailCalla" }], occasionIds: ["sympathy", "love"], availability: "AVAILABLE", sameDayEligible: true, sizes: standardSizes, tones: [tones.pink, tones.white, tones["florist-choice"]], imageTone: "quiet" },
];

export function getProductBySlug(slug: string | undefined) { return products.find((product) => product.slug === slug); }

export const budgetRanges: BudgetRange[] = [
  { id: "small", image: "detailCalla" },
  { id: "medium", image: "productRoseLetter" },
  { id: "large", image: "productAmberStudy" },
  { id: "statement", image: "productHydrangea" },
];
