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
  currency: "VND",
  delivery: {
    standardNote: "Thời gian và khu vực giao sẽ được xác nhận trước khi hoàn tất đơn.",
    sameDayNote: "Có thể giao trong ngày với đơn đặt trước giờ cắt và khu vực phù hợp.",
  },
  year: 2026,
  navigation: [
    { label: "Hoa", to: "/flowers" },
    { label: "Theo dịp", to: "/#occasions" },
    { label: "Đặt hoa riêng", to: "/#custom" },
    { label: "Giao trong ngày", to: "/#same-day" },
    { label: "Về Luméa", to: "/#why-lumea" },
    { label: "Ghé studio", to: "/#visit" },
  ] satisfies NavigationItem[],
} as const;
