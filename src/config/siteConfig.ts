import type { NavigationItem } from "../types/content";

export const siteConfig = {
  brandName: "LUMÉA",
  brandDisplayName: "Luméa",
  descriptor: "Flower Studio",
  city: "Saigon",
  monogram: "L",
  tagline: "Hoa cho những điều khó nói thành lời.",
  phoneDisplay: "0900 000 000",
  phoneHref: "tel:0900000000",
  email: "hello@lumea.flowers",
  instagramHandle: "@lumeaflowers",
  year: 2026,
  navigation: [
    { label: "Hoa", href: "#best-sellers" },
    { label: "Theo dịp", href: "#occasions" },
    { label: "Đặt hoa riêng", href: "#custom" },
    { label: "Giao trong ngày", href: "#same-day" },
    { label: "Về Luméa", href: "#why-lumea" },
    { label: "Ghé studio", href: "#visit" },
  ] satisfies NavigationItem[],
} as const;
