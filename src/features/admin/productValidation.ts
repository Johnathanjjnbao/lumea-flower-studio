import type { AdminProductDraft, AdminProductVariant } from "./types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export interface ValidationIssue {
  field: string;
  message: string;
}

function variantIssues(variant: AdminProductVariant, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!SLUG_PATTERN.test(variant.stableCode)) {
    issues.push({ field: `variant-${index}-code`, message: "Mã biến thể chỉ dùng chữ thường, số và dấu gạch nối." });
  }
  if (!SKU_PATTERN.test(variant.sku) || variant.sku.length > 96) {
    issues.push({ field: `variant-${index}-sku`, message: "SKU chỉ dùng chữ in hoa, số và dấu gạch nối, tối đa 96 ký tự." });
  }
  if (variant.priceAmount === null || !Number.isInteger(variant.priceAmount) || variant.priceAmount < 0) {
    issues.push({ field: `variant-${index}-price`, message: "Giá phải là số nguyên VND từ 0 trở lên." });
  }
  if (!variant.viName.trim() || !variant.koName.trim()) {
    issues.push({ field: `variant-${index}-name`, message: "Biến thể cần tên tiếng Việt và tiếng Hàn." });
  }
  return issues;
}

export function validateProductDraft(product: AdminProductDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!SLUG_PATTERN.test(product.slug)) {
    issues.push({ field: "slug", message: "Slug chỉ dùng chữ thường, số và dấu gạch nối." });
  }
  if (!product.categoryId) issues.push({ field: "category", message: "Hãy chọn Category cho sản phẩm." });
  if (!Number.isInteger(product.sortOrder) || product.sortOrder < 0) {
    issues.push({ field: "sortOrder", message: "Thứ tự hiển thị phải là số nguyên từ 0 trở lên." });
  }
  product.variants.forEach((variant, index) => issues.push(...variantIssues(variant, index)));
  return issues;
}

export function validateProductForPublish(product: AdminProductDraft): ValidationIssue[] {
  const issues = validateProductDraft(product);
  if (!product.vi.name.trim()) issues.push({ field: "vi-name", message: "Cần tên sản phẩm tiếng Việt." });
  if (!product.ko.name.trim()) issues.push({ field: "ko-name", message: "Cần tên sản phẩm tiếng Hàn." });
  if (
    (product.productType === "READY_MADE_BOUQUET" || product.productType === "FLORIST_CHOICE")
    && !product.variants.some((variant) => variant.active && variant.priceAmount !== null && variant.priceAmount >= 0)
  ) {
    issues.push({ field: "variants", message: "Cần ít nhất một biến thể đang hoạt động với giá hợp lệ." });
  }
  if (!product.images.some((image) => image.active && image.role === "PRIMARY")) {
    issues.push({ field: "images", message: "Cần chọn một ảnh chính trước khi xuất bản." });
  }
  return issues;
}

export function makeStableCode(slug: string) {
  return slug.trim().toLowerCase();
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export function validateProductImage(file: File) {
  if (!file.size) throw new Error("Tệp ảnh trống hoặc không đọc được.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || !extension || !ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.");
  }
  return extension === "jpeg" ? "jpg" : extension;
}
