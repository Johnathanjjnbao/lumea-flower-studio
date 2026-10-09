import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type { Database, Json } from "../../../types/database.generated";
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
  id, stable_code, slug, product_type, category_id, visibility, availability,
  same_day_eligible, sort_order, updated_at,
  product_translations(locale, name, short_description, description, composition, seo_title, seo_description),
  product_variants(id, stable_code, sku, price_amount, active, sort_order, product_variant_translations(locale, name)),
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
        id, slug, product_type, category_id, visibility, availability, same_day_eligible, updated_at,
        categories(category_translations(locale, name)),
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
        categoryName: row.categories?.category_translations.find((translation) => translation.locale === "vi")?.name ?? "Chưa có Category",
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
      categoryId: row.category_id,
      visibility: row.visibility,
      availability: row.availability,
      sameDayEligible: row.same_day_eligible,
      sortOrder: row.sort_order,
      vi: localizedContent(row.product_translations, "vi"),
      ko: localizedContent(row.product_translations, "ko"),
      variants: row.product_variants.map((variant) => ({
        id: variant.id,
        stableCode: variant.stable_code,
        sku: variant.sku,
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
    const [categoryResult, occasionResult, toneResult] = await Promise.all([
      this.client.from("categories").select("id, stable_code, sort_order, category_translations(locale, name)").neq("visibility", "ARCHIVED").order("sort_order"),
      this.client.from("occasions").select("id, stable_code, sort_order, occasion_translations(locale, name)").neq("visibility", "ARCHIVED").order("sort_order"),
      this.client.from("tones").select("id, stable_code, swatch_value, sort_order, tone_translations(locale, name)").neq("visibility", "ARCHIVED").order("sort_order"),
    ]);
    if (categoryResult.error) fail("Không thể tải Category", categoryResult.error);
    if (occasionResult.error) fail("Không thể tải dịp tặng", occasionResult.error);
    if (toneResult.error) fail("Không thể tải tone màu", toneResult.error);
    return {
      categories: (categoryResult.data ?? []).map((row) => ({
        id: row.id,
        stableCode: row.stable_code,
        name: row.category_translations.find((translation) => translation.locale === "vi")?.name ?? row.stable_code,
        secondaryName: row.category_translations.find((translation) => translation.locale === "ko")?.name ?? "",
      })),
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

  async saveProduct(product: AdminProductDraft) {
    const localizedPayload = (content: LocalizedProductContent) => ({
      name: content.name.trim(),
      short_description: content.shortDescription.trim(),
      description: content.description.trim(),
      composition: content.composition.split("\n").map((item) => item.trim()).filter(Boolean),
      seo_title: content.seoTitle.trim(),
      seo_description: content.seoDescription.trim(),
    });
    const payload: Json = {
      id: product.id ?? null,
      stable_code: product.stableCode ?? makeStableCode(product.slug),
      slug: product.slug,
      product_type: product.productType,
      category_id: product.categoryId,
      availability: product.availability,
      same_day_eligible: product.sameDayEligible,
      sort_order: product.sortOrder,
      vi: localizedPayload(product.vi),
      ko: localizedPayload(product.ko),
      variants: product.variants.map((variant) => ({
        id: variant.id ?? null,
        stable_code: variant.stableCode,
        sku: variant.sku,
        price_amount: variant.priceAmount ?? 0,
        active: variant.active,
        sort_order: variant.sortOrder,
        vi_name: variant.viName.trim(),
        ko_name: variant.koName.trim(),
      })),
      occasion_ids: product.occasionIds,
      tone_ids: product.toneIds,
    };
    const { data: productId, error } = await this.client.rpc("admin_save_product_atomic", { product_payload: payload });
    if (error) fail("Không thể lưu Product atomically", error);
    if (!productId) throw new Error("Database không trả về Product ID sau khi lưu.");
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
