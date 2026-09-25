import type { BudgetRange, Occasion, Product, ProductSize, ProductTone } from "../types/content";

export const occasions: Occasion[] = [
  { id: "birthday", name: "Sinh nhật", image: "occasionBirthday", alt: "Hoa sinh nhật với tone hồng ấm" },
  { id: "love", name: "Tình yêu & Kỷ niệm", image: "occasionLove", alt: "Hoa cho tình yêu và kỷ niệm" },
  { id: "congrats", name: "Chúc mừng", image: "occasionCongrats", alt: "Bó hoa chúc mừng rực rỡ" },
  { id: "graduation", name: "Tốt nghiệp", image: "occasionGraduation", alt: "Hoa mừng tốt nghiệp thanh lịch" },
  { id: "opening", name: "Khai trương", image: "occasionOpening", alt: "Hoa khai trương mang sắc ấm" },
  { id: "sympathy", name: "Chia buồn", image: "occasionSympathy", alt: "Hoa chia buồn trang nhã", tone: "quiet" },
];

const standardSizes: ProductSize[] = [
  { id: "standard", label: "Standard", priceDelta: 0, description: "Gọn gàng, vừa đủ cho một lời nhắn dịu dàng." },
  { id: "large", label: "Large", priceDelta: 180000, description: "Đầy đặn hơn với nhiều lớp hoa và lá." },
  { id: "premium", label: "Premium", priceDelta: 350000, description: "Một composition có độ mở và hiện diện nổi bật." },
];

const tones: Record<ProductTone["id"], ProductTone> = {
  pastel: { id: "pastel", label: "Pastel", swatch: "#dcc4bd" },
  pink: { id: "pink", label: "Hồng", swatch: "#c88f9b" },
  white: { id: "white", label: "Trắng", swatch: "#eee8de" },
  warm: { id: "warm", label: "Ấm", swatch: "#c78362" },
  "florist-choice": { id: "florist-choice", label: "Florist’s Choice", swatch: "#9ea58f" },
};

export const products: Product[] = [
  {
    id: "pink-garden",
    slug: "pink-garden",
    name: "Pink Garden",
    category: "Thiết kế đặc trưng",
    shortDescription: "Hồng garden · Cúc nhánh · Lá bạc",
    description: "Một khu vườn hồng mềm mại, được kết thoáng tay để giữ vẻ tự nhiên của từng cành hoa.",
    basePrice: 650000,
    images: [{ asset: "productPink", alt: "Bó hoa Pink Garden tone hồng" }],
    composition: ["Hồng garden", "Cúc nhánh", "Lá bạc"],
    occasions: ["Sinh nhật", "Tình yêu & Kỷ niệm"],
    availability: "AVAILABLE",
    sameDayEligible: true,
    sizes: standardSizes,
    tones: [tones.pastel, tones.pink, tones["florist-choice"]],
    tag: "Được yêu thích",
  },
  {
    id: "morning-peony",
    slug: "morning-peony",
    name: "Morning Peony",
    category: "Hoa theo mùa",
    shortDescription: "Mẫu đơn · Hồng kem · Thanh liễu",
    description: "Những lớp cánh sáng trong và thanh nhẹ, dành cho khoảnh khắc cần một vẻ đẹp thật yên.",
    basePrice: 820000,
    images: [{ asset: "productPeony", alt: "Bó hoa Morning Peony sáng trong" }],
    composition: ["Mẫu đơn theo mùa", "Hồng kem", "Thanh liễu"],
    occasions: ["Sinh nhật", "Chúc mừng", "Tốt nghiệp"],
    availability: "SEASONAL",
    sameDayEligible: false,
    sizes: standardSizes,
    tones: [tones.pastel, tones.white, tones["florist-choice"]],
  },
  {
    id: "white-poetry",
    slug: "white-poetry",
    name: "White Poetry",
    category: "Thanh sắc trắng",
    shortDescription: "Hồng trắng · Phi yến · Hoa ren",
    description: "Một bản phối trắng thanh thoát, có chiều sâu từ hình dáng cành và những chi tiết nhỏ nhẹ như ren.",
    basePrice: 720000,
    images: [{ asset: "productWhite", alt: "Bó hoa White Poetry tone trắng" }],
    composition: ["Hồng trắng", "Phi yến", "Hoa ren"],
    occasions: ["Chúc mừng", "Chia buồn"],
    availability: "SEASONAL",
    sameDayEligible: true,
    sizes: standardSizes,
    tones: [tones.white, tones.pastel, tones["florist-choice"]],
    tag: "Theo mùa",
    tagTone: "light",
    imageTone: "quiet",
  },
  {
    id: "warm-embrace",
    slug: "warm-embrace",
    name: "Warm Embrace",
    category: "Tone ấm",
    shortDescription: "Hồng cam · Mao lương · Cúc tana",
    description: "Sắc cam và kem được cân bằng bằng những cành nhỏ, tạo cảm giác ấm áp mà vẫn tinh tế.",
    basePrice: 890000,
    images: [{ asset: "productWarm", alt: "Bó hoa Warm Embrace tone ấm" }],
    composition: ["Hồng cam", "Mao lương", "Cúc tana"],
    occasions: ["Tình yêu & Kỷ niệm", "Khai trương"],
    availability: "AVAILABLE",
    sameDayEligible: false,
    sizes: standardSizes,
    tones: [tones.warm, tones.pink, tones["florist-choice"]],
  },
];

export function getProductBySlug(slug: string | undefined) {
  return products.find((product) => product.slug === slug);
}

export const budgetRanges: BudgetRange[] = [
  { id: "small", scale: "Gọn nhẹ", label: "Dưới 500k", note: "Một lời nhắn dịu dàng", image: "productWhite", alt: "Bó hoa nhỏ tinh tế trong tone trắng" },
  { id: "medium", scale: "Signature", label: "500–800k", note: "Đủ đầy cho một dịp đáng nhớ", image: "productPink", alt: "Bó hoa cỡ vừa theo phong cách đặc trưng" },
  { id: "large", scale: "Đầy đặn", label: "800k–1.2m", note: "Một composition nhiều lớp", image: "productPeony", alt: "Bó hoa lớn với nhiều lớp hoa" },
  { id: "statement", scale: "Statement", label: "Trên 1.2m", note: "Ấn tượng ngay từ ánh nhìn đầu tiên", image: "productWarm", alt: "Thiết kế hoa statement có quy mô nổi bật" },
];
