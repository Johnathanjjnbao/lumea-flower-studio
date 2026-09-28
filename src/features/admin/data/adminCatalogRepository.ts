import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type { Database } from "../../../types/database.generated";
import { makeStableCode } from "../productValidation";
import { discardUploadedPublicMediaAsset, updatePublicMediaCopy, uploadPublicMediaAsset } from "./adminMediaService";
import type {
  AdminProductDraft,
  AdminProductFilters,
  AdminProductImage,
  AdminProductListItem,
  AdminTaxonomy,
  LocalizedProductContent,
  VisibilityStatus,
} from "../types";

const ADMIN_PRODUCT_SELECT = `
  id, stable_code, slug, product_type, visibility, availability,
  same_day_eligible, sort_order, updated_at,
  product_translations(locale, name, short_description, description, composition, seo_title, seo_description),
  product_variants(id, stable_code, price_amount, active, sort_order, product_variant_translations(locale, name)),
  product_occasions(occasion_id),
  product_tones(tone_id, active),
  product_images(id, media_asset_id, role, active, sort_order,
    media_assets(storage_bucket, storage_path, status,
      media_asset_translations(locale, alt_text)))
` as const;

type ProductRow = Awaited<ReturnType<typeof loadProductRow>>;

function fail(message: string, error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
  throw new Error(code ? `${message} (${code}).` : message);
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function localizedContent(
  translations: NonNullable<ProductRow>["product_translations"],
  locale: "vi" | "ko",
): LocalizedProductContent {
  const row = translations.find((translation) => translation.locale === locale);
  return {
    name: row?.name ?? "",
    shortDescription: row?.short_description ?? "",
    description: row?.description ?? "",
    composition: row?.composition.join("\n") ?? "",
    seoTitle: row?.seo_title ?? "",
    seoDescription: row?.seo_description ?? "",
  };
}

async function loadProductRow(client: SupabaseClient<Database>, productId: string) {
  const { data, error } = await client
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle();
  if (error) fail("Không thể tải sản phẩm", error);
  return data;
}

export interface AdminCatalogRepository {
  listProducts(filters?: AdminProductFilters): Promise<AdminProductListItem[]>;
  getProduct(productId: string): Promise<AdminProductDraft | null>;
  getTaxonomy(): Promise<AdminTaxonomy>;
  saveProduct(product: AdminProductDraft): Promise<AdminProductDraft>;
  setVisibility(productId: string, visibility: VisibilityStatus): Promise<void>;
  uploadProductImage(product: AdminProductDraft, file: File, viAlt: string, koAlt: string): Promise<AdminProductImage>;
  updateImageAlt(mediaAssetId: string, viAlt: string, koAlt: string): Promise<void>;
  setPrimaryImage(productId: string, imageId: string): Promise<void>;
  deactivateImage(imageId: string): Promise<void>;
  reorderImages(images: AdminProductImage[]): Promise<void>;
}

export class SupabaseAdminCatalogRepository implements AdminCatalogRepository {
  constructor(private readonly client: SupabaseClient<Database> = requireSupabaseClient()) {}

  async listProducts(filters: AdminProductFilters = {}) {
    const { data, error } = await this.client
      .from("products")
      .select(`
        id, slug, product_type, visibility, availability, same_day_eligible, updated_at,
        product_translations(locale, name),
        product_variants(price_amount, active),
        product_images(role, active, media_assets(storage_bucket, storage_path, status))
      `)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) fail("Không thể tải danh sách sản phẩm", error);

    const search = filters.search?.trim().toLocaleLowerCase("vi") ?? "";
    return (data ?? []).map((row) => {
      const prices = row.product_variants.filter((variant) => variant.active).map((variant) => variant.price_amount);
      const media = row.product_images.find((image) => image.active && image.role === "PRIMARY")?.media_assets;
      const viName = row.product_translations.find((translation) => translation.locale === "vi")?.name;
      return {
        id: row.id,
        slug: row.slug,
        productType: row.product_type,
        visibility: row.visibility,
        availability: row.availability,
        sameDayEligible: row.same_day_eligible,
        name: viName || row.product_translations[0]?.name || "Chưa có tên",
        thumbnailUrl: media && media.status === "ACTIVE"
          ? this.client.storage.from(media.storage_bucket).getPublicUrl(media.storage_path).data.publicUrl
          : null,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        updatedAt: row.updated_at,
      } satisfies AdminProductListItem;
    }).filter((product) => {
      if (search && !`${product.name} ${product.slug}`.toLocaleLowerCase("vi").includes(search)) return false;
      if (filters.visibility && filters.visibility !== "ALL" && product.visibility !== filters.visibility) return false;
      if (filters.availability && filters.availability !== "ALL" && product.availability !== filters.availability) return false;
      if (filters.productType && filters.productType !== "ALL" && product.productType !== filters.productType) return false;
      return true;
    });
  }

  async getProduct(productId: string) {
    const row = await loadProductRow(this.client, productId);
    if (!row) return null;
    const images = row.product_images.map((image) => {
      const media = image.media_assets;
      const translations = media?.media_asset_translations ?? [];
      return {
        id: image.id,
        mediaAssetId: image.media_asset_id,
        url: media
          ? this.client.storage.from(media.storage_bucket).getPublicUrl(media.storage_path).data.publicUrl
          : "",
        storagePath: media?.storage_path ?? "",
        role: image.role,
        active: image.active && media?.status === "ACTIVE",
        sortOrder: image.sort_order,
        viAlt: translations.find((translation) => translation.locale === "vi")?.alt_text ?? "",
        koAlt: translations.find((translation) => translation.locale === "ko")?.alt_text ?? "",
      } satisfies AdminProductImage;
    }).filter((image) => image.active).sort((left, right) => left.sortOrder - right.sortOrder);

    return {
      id: row.id,
      stableCode: row.stable_code,
      slug: row.slug,
      productType: row.product_type,
      visibility: row.visibility,
      availability: row.availability,
      sameDayEligible: row.same_day_eligible,
      sortOrder: row.sort_order,
      vi: localizedContent(row.product_translations, "vi"),
      ko: localizedContent(row.product_translations, "ko"),
      variants: row.product_variants.map((variant) => ({
        id: variant.id,
        stableCode: variant.stable_code,
        priceAmount: variant.price_amount,
        active: variant.active,
        sortOrder: variant.sort_order,
        viName: variant.product_variant_translations.find((translation) => translation.locale === "vi")?.name ?? "",
        koName: variant.product_variant_translations.find((translation) => translation.locale === "ko")?.name ?? "",
      })).sort((left, right) => left.sortOrder - right.sortOrder),
      occasionIds: row.product_occasions.map((relation) => relation.occasion_id),
      toneIds: row.product_tones.filter((relation) => relation.active).map((relation) => relation.tone_id),
      images,
      updatedAt: row.updated_at,
    } satisfies AdminProductDraft;
  }

  async getTaxonomy() {
    const [occasionResult, toneResult] = await Promise.all([
      this.client.from("occasions").select("id, stable_code, sort_order, occasion_translations(locale, name)").neq("visibility", "ARCHIVED").order("sort_order"),
      this.client.from("tones").select("id, stable_code, swatch_value, sort_order, tone_translations(locale, name)").neq("visibility", "ARCHIVED").order("sort_order"),
    ]);
    if (occasionResult.error) fail("Không thể tải dịp tặng", occasionResult.error);
    if (toneResult.error) fail("Không thể tải tone màu", toneResult.error);
    return {
      occasions: (occasionResult.data ?? []).map((row) => ({
        id: row.id,
        stableCode: row.stable_code,
        name: row.occasion_translations.find((translation) => translation.locale === "vi")?.name ?? row.stable_code,
        secondaryName: row.occasion_translations.find((translation) => translation.locale === "ko")?.name ?? "",
      })),
      tones: (toneResult.data ?? []).map((row) => ({
        id: row.id,
        stableCode: row.stable_code,
        name: row.tone_translations.find((translation) => translation.locale === "vi")?.name ?? row.stable_code,
        secondaryName: row.tone_translations.find((translation) => translation.locale === "ko")?.name ?? "",
        swatchValue: row.swatch_value,
      })),
    } satisfies AdminTaxonomy;
  }

  private async saveTranslation(productId: string, locale: "vi" | "ko", content: LocalizedProductContent) {
    if (!content.name.trim()) {
      const { error } = await this.client.from("product_translations").delete().eq("product_id", productId).eq("locale", locale);
      if (error) fail(`Không thể xoá nội dung ${locale.toUpperCase()}`, error);
      return;
    }
    const { error } = await this.client.from("product_translations").upsert({
      product_id: productId,
      locale,
      name: content.name.trim(),
      short_description: nullable(content.shortDescription),
      description: nullable(content.description),
      composition: content.composition.split("\n").map((item) => item.trim()).filter(Boolean),
      seo_title: nullable(content.seoTitle),
      seo_description: nullable(content.seoDescription),
    }, { onConflict: "product_id,locale" });
    if (error) fail(`Không thể lưu nội dung ${locale.toUpperCase()}`, error);
  }

  async saveProduct(product: AdminProductDraft) {
    let productId = product.id;
    if (!productId) {
      const { data, error } = await this.client.from("products").insert({
        stable_code: makeStableCode(product.slug),
        slug: product.slug,
        product_type: product.productType,
        availability: product.availability,
        same_day_eligible: product.sameDayEligible,
        sort_order: product.sortOrder,
        visibility: "DRAFT",
      }).select("id").single();
      if (error) fail("Không thể tạo sản phẩm nháp", error);
      if (!data) throw new Error("Database không trả về Product ID sau khi tạo.");
      productId = data.id;
    } else {
      if (product.visibility === "PUBLISHED") {
        const hidden = await this.client.from("products").update({ visibility: "HIDDEN" }).eq("id", productId);
        if (hidden.error) fail("Không thể đưa sản phẩm về trạng thái an toàn trước khi lưu", hidden.error);
      }
      const { error } = await this.client.from("products").update({
        slug: product.slug,
        product_type: product.productType,
        availability: product.availability,
        same_day_eligible: product.sameDayEligible,
        sort_order: product.sortOrder,
      }).eq("id", productId);
      if (error) fail("Không thể cập nhật thông tin chung", error);
    }

    await this.saveTranslation(productId, "vi", product.vi);
    await this.saveTranslation(productId, "ko", product.ko);

    const retainedVariantIds: string[] = [];
    for (const variant of product.variants) {
      let variantId = variant.id;
      const payload = {
        product_id: productId,
        stable_code: variant.stableCode,
        price_amount: variant.priceAmount ?? 0,
        active: variant.active,
        sort_order: variant.sortOrder,
      };
      if (variantId) {
        const { error } = await this.client.from("product_variants").update(payload).eq("id", variantId).eq("product_id", productId);
        if (error) fail("Không thể cập nhật biến thể", error);
      } else {
        const { data, error } = await this.client.from("product_variants").insert(payload).select("id").single();
        if (error) fail("Không thể tạo biến thể", error);
        if (!data) throw new Error("Database không trả về Variant ID sau khi tạo.");
        variantId = data.id;
      }
      retainedVariantIds.push(variantId);
      const { error: translationError } = await this.client.from("product_variant_translations").upsert([
        { product_variant_id: variantId, locale: "vi", name: variant.viName.trim() },
        { product_variant_id: variantId, locale: "ko", name: variant.koName.trim() },
      ], { onConflict: "product_variant_id,locale" });
      if (translationError) fail("Không thể lưu tên biến thể", translationError);
    }
    const existing = await this.client.from("product_variants").select("id").eq("product_id", productId);
    if (existing.error) fail("Không thể kiểm tra biến thể", existing.error);
    const removedIds = (existing.data ?? []).map((row) => row.id).filter((id) => !retainedVariantIds.includes(id));
    if (removedIds.length) {
      const { error } = await this.client.from("product_variants").update({ active: false }).in("id", removedIds);
      if (error) fail("Không thể vô hiệu biến thể đã xoá", error);
    }

    const { error: occasionDeleteError } = await this.client.from("product_occasions").delete().eq("product_id", productId);
    if (occasionDeleteError) fail("Không thể cập nhật dịp tặng", occasionDeleteError);
    if (product.occasionIds.length) {
      const { error } = await this.client.from("product_occasions").insert(product.occasionIds.map((occasionId, index) => ({ product_id: productId, occasion_id: occasionId, sort_order: index })));
      if (error) fail("Không thể lưu dịp tặng", error);
    }
    const { error: toneDeleteError } = await this.client.from("product_tones").delete().eq("product_id", productId);
    if (toneDeleteError) fail("Không thể cập nhật tone màu", toneDeleteError);
    if (product.toneIds.length) {
      const { error } = await this.client.from("product_tones").insert(product.toneIds.map((toneId, index) => ({ product_id: productId, tone_id: toneId, sort_order: index, active: true })));
      if (error) fail("Không thể lưu tone màu", error);
    }
    if (product.visibility === "PUBLISHED") {
      const restored = await this.client.from("products").update({ visibility: "PUBLISHED" }).eq("id", productId);
      if (restored.error) fail("Nội dung đã lưu nhưng sản phẩm chưa thể xuất bản lại", restored.error);
    }
    const saved = await this.getProduct(productId);
    if (!saved) throw new Error("Sản phẩm đã lưu nhưng không thể tải lại.");
    return saved;
  }

  async setVisibility(productId: string, visibility: VisibilityStatus) {
    const { error } = await this.client.from("products").update({ visibility }).eq("id", productId);
    if (error) fail("Không thể cập nhật trạng thái sản phẩm", error);
  }

  async uploadProductImage(product: AdminProductDraft, file: File, viAlt: string, koAlt: string) {
    if (!product.id) throw new Error("Hãy lưu sản phẩm nháp trước khi tải ảnh.");
    const uploaded = await uploadPublicMediaAsset(this.client, file, {
      pathPrefix: `products/${product.id}`,
      viAlt,
      koAlt,
      fallbackVi: product.vi.name.trim() || "Ảnh sản phẩm Luméa",
      fallbackKo: product.ko.name.trim() || "Luméa 상품 이미지",
    });
    try {
      const isFirst = !product.images.some((image) => image.active);
      const placement = await this.client.from("product_images").insert({
        product_id: product.id,
        media_asset_id: uploaded.mediaAssetId,
        role: isFirst ? "PRIMARY" : "GALLERY",
        active: true,
        sort_order: product.images.length,
      }).select("id, role, sort_order").single();
      if (placement.error) fail("Không thể gắn ảnh vào sản phẩm", placement.error);
      if (!placement.data) throw new Error("Database không trả về Image placement sau khi tạo.");
      return {
        id: placement.data.id,
        mediaAssetId: uploaded.mediaAssetId,
        url: uploaded.url,
        storagePath: uploaded.storagePath,
        role: placement.data.role,
        active: true,
        sortOrder: placement.data.sort_order,
        viAlt: uploaded.viAlt,
        koAlt: uploaded.koAlt,
      } satisfies AdminProductImage;
    } catch (error) {
      await discardUploadedPublicMediaAsset(this.client, uploaded);
      throw error;
    }
  }

  async setPrimaryImage(productId: string, imageId: string) {
    const { error } = await this.client.rpc("set_product_primary_image", { target_product_id: productId, target_image_id: imageId });
    if (error) fail("Không thể đổi ảnh chính", error);
  }

  async updateImageAlt(mediaAssetId: string, viAlt: string, koAlt: string) {
    await updatePublicMediaCopy(this.client, mediaAssetId, { viAlt, koAlt });
  }

  async deactivateImage(imageId: string) {
    const { error } = await this.client.from("product_images").update({ active: false, role: "GALLERY" }).eq("id", imageId);
    if (error) fail("Không thể gỡ ảnh khỏi sản phẩm", error);
  }

  async reorderImages(images: AdminProductImage[]) {
    for (const [index, image] of images.entries()) {
      const { error } = await this.client.from("product_images").update({ sort_order: index }).eq("id", image.id);
      if (error) fail("Không thể lưu thứ tự ảnh", error);
    }
  }
}

export function createAdminCatalogRepository() {
  return new SupabaseAdminCatalogRepository();
}
