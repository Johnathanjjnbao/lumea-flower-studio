import type { BudgetRange, Occasion, Product } from "../types/content";

export const occasions: Occasion[] = [
  { id: "birthday", name: "Sinh nhật", image: "occasionBirthday", alt: "Hoa sinh nhật với tone hồng ấm" },
  { id: "love", name: "Tình yêu & Kỷ niệm", image: "occasionLove", alt: "Hoa cho tình yêu và kỷ niệm" },
  { id: "congrats", name: "Chúc mừng", image: "occasionCongrats", alt: "Bó hoa chúc mừng rực rỡ" },
  { id: "graduation", name: "Tốt nghiệp", image: "occasionGraduation", alt: "Hoa mừng tốt nghiệp thanh lịch" },
  { id: "opening", name: "Khai trương", image: "occasionOpening", alt: "Hoa khai trương mang sắc ấm" },
  { id: "sympathy", name: "Chia buồn", image: "occasionSympathy", alt: "Hoa chia buồn trang nhã", tone: "quiet" },
];

export const products: Product[] = [
  {
    id: "pink-garden",
    name: "Pink Garden",
    category: "Thiết kế đặc trưng",
    description: "Hồng garden · Cúc nhánh · Lá bạc",
    price: "650.000đ",
    image: "productPink",
    alt: "Bó hoa Pink Garden tone hồng",
    tag: "Được yêu thích",
  },
  {
    id: "morning-peony",
    name: "Morning Peony",
    category: "Hoa theo mùa",
    description: "Mẫu đơn · Hồng kem · Thanh liễu",
    price: "820.000đ",
    image: "productPeony",
    alt: "Bó hoa Morning Peony sáng trong",
  },
  {
    id: "white-poetry",
    name: "White Poetry",
    category: "Thanh sắc trắng",
    description: "Hồng trắng · Phi yến · Hoa ren",
    price: "720.000đ",
    image: "productWhite",
    alt: "Bó hoa White Poetry tone trắng",
    tag: "Theo mùa",
    tagTone: "light",
    imageTone: "quiet",
  },
  {
    id: "warm-embrace",
    name: "Warm Embrace",
    category: "Tone ấm",
    description: "Hồng cam · Mao lương · Cúc tana",
    price: "890.000đ",
    image: "productWarm",
    alt: "Bó hoa Warm Embrace tone ấm",
  },
];

export const budgetRanges: BudgetRange[] = [
  { id: "small", scale: "Gọn nhẹ", label: "Dưới 500k", note: "Một lời nhắn dịu dàng", image: "productWhite", alt: "Bó hoa nhỏ tinh tế trong tone trắng" },
  { id: "medium", scale: "Signature", label: "500–800k", note: "Đủ đầy cho một dịp đáng nhớ", image: "productPink", alt: "Bó hoa cỡ vừa theo phong cách đặc trưng" },
  { id: "large", scale: "Đầy đặn", label: "800k–1.2m", note: "Một composition nhiều lớp", image: "productPeony", alt: "Bó hoa lớn với nhiều lớp hoa" },
  { id: "statement", scale: "Statement", label: "Trên 1.2m", note: "Ấn tượng ngay từ ánh nhìn đầu tiên", image: "productWarm", alt: "Thiết kế hoa statement có quy mô nổi bật" },
];
