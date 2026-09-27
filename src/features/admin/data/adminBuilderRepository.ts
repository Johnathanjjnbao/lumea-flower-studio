import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type { Database } from "../../../types/database.generated";
import { validateProductImage } from "../productValidation";
import type {
  AdminFlowerDraft, AdminFlowerImage, AdminFlowerListItem, AdminWrappingOptionDraft,
  AdminWrappingVariantDraft, LocalizedBuilderContent, VisibilityStatus,
} from "../types";

function fail(message: string, error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
  throw new Error(code ? `${message} (${code}).` : message);
}

function translation<T extends { locale: string; name: string; description: string | null }>(rows: T[], locale: "vi" | "ko"): LocalizedBuilderContent {
  const row = rows.find((item) => item.locale === locale);
  return { name: row?.name ?? "", description: row?.description ?? "" };
}

async function profileId(client: SupabaseClient<Database>) {
  const result = await client.rpc("current_admin_profile_id");
  if (result.error || !result.data) fail("Không thể xác định hồ sơ Admin", result.error);
  return result.data;
}

export class SupabaseAdminBuilderRepository {
  constructor(private readonly client: SupabaseClient<Database> = requireSupabaseClient()) {}

  async listFlowers(): Promise<AdminFlowerListItem[]> {
    const { data, error } = await this.client.from("flower_stems").select(`
      id, stable_code, visibility, availability, price_per_stem_amount, updated_at,
      flower_stem_translations(locale, name),
      media_assets(storage_bucket, storage_path, status)
    `).order("sort_order").limit(200);
    if (error) fail("Không thể tải danh sách hoa", error);
    return (data ?? []).map((row) => ({
      id: row.id,
      stableCode: row.stable_code,
      name: row.flower_stem_translations.find((item) => item.locale === "vi")?.name ?? row.stable_code,
      visibility: row.visibility,
      availability: row.availability,
      pricePerStem: row.price_per_stem_amount,
      thumbnailUrl: row.media_assets?.status === "ACTIVE"
        ? this.client.storage.from(row.media_assets.storage_bucket).getPublicUrl(row.media_assets.storage_path).data.publicUrl
        : null,
      updatedAt: row.updated_at,
    }));
  }

  async getFlower(id: string): Promise<AdminFlowerDraft | null> {
    const { data: row, error } = await this.client.from("flower_stems").select(`
      id, stable_code, visibility, availability, price_per_stem_amount, seasonal_note_required, sort_order, updated_at,
      flower_stem_translations(locale, name, description, image_alt),
      media_assets(id, storage_bucket, storage_path, status, media_asset_translations(locale, alt_text))
    `).eq("id", id).maybeSingle();
    if (error) fail("Không thể tải loại hoa", error);
    if (!row) return null;
    const media = row.media_assets;
    const translations = media?.media_asset_translations ?? [];
    return {
      id: row.id,
      stableCode: row.stable_code,
      visibility: row.visibility,
      availability: row.availability,
      pricePerStem: row.price_per_stem_amount,
      seasonalNoteRequired: row.seasonal_note_required,
      sortOrder: row.sort_order,
      vi: translation(row.flower_stem_translations, "vi"),
      ko: translation(row.flower_stem_translations, "ko"),
      image: media && media.status === "ACTIVE" ? {
        mediaAssetId: media.id,
        storagePath: media.storage_path,
        url: this.client.storage.from(media.storage_bucket).getPublicUrl(media.storage_path).data.publicUrl,
        viAlt: translations.find((item) => item.locale === "vi")?.alt_text ?? row.flower_stem_translations.find((item) => item.locale === "vi")?.image_alt ?? "",
        koAlt: translations.find((item) => item.locale === "ko")?.alt_text ?? row.flower_stem_translations.find((item) => item.locale === "ko")?.image_alt ?? "",
      } : null,
      updatedAt: row.updated_at,
    };
  }

  private async saveFlowerTranslation(id: string, locale: "vi" | "ko", content: LocalizedBuilderContent, imageAlt: string) {
    const { error } = await this.client.from("flower_stem_translations").upsert({
      flower_stem_id: id, locale, name: content.name.trim(), description: content.description.trim() || null, image_alt: imageAlt.trim(),
    }, { onConflict: "flower_stem_id,locale" });
    if (error) fail(`Không thể lưu nội dung hoa ${locale.toUpperCase()}`, error);
  }

  async saveFlower(flower: AdminFlowerDraft) {
    let id = flower.id;
    const wasPublished = flower.visibility === "PUBLISHED";
    if (!id) {
      const created = await this.client.from("flower_stems").insert({
        stable_code: flower.stableCode.trim(), visibility: "DRAFT", availability: flower.availability,
        price_per_stem_amount: flower.pricePerStem ?? 0, seasonal_note_required: flower.seasonalNoteRequired,
        sort_order: flower.sortOrder,
      }).select("id").single();
      if (created.error || !created.data) fail("Không thể tạo loại hoa", created.error);
      id = created.data.id;
    } else {
      if (wasPublished) {
        const hidden = await this.client.from("flower_stems").update({ visibility: "HIDDEN" }).eq("id", id);
        if (hidden.error) fail("Không thể đưa loại hoa về trạng thái an toàn", hidden.error);
      }
      const updated = await this.client.from("flower_stems").update({
        stable_code: flower.stableCode.trim(), availability: flower.availability,
        price_per_stem_amount: flower.pricePerStem ?? 0, seasonal_note_required: flower.seasonalNoteRequired,
        sort_order: flower.sortOrder,
      }).eq("id", id);
      if (updated.error) fail("Không thể cập nhật loại hoa", updated.error);
    }
    const viAlt = flower.image?.viAlt.trim() || flower.vi.name.trim();
    const koAlt = flower.image?.koAlt.trim() || flower.ko.name.trim();
    await this.saveFlowerTranslation(id, "vi", flower.vi, viAlt);
    await this.saveFlowerTranslation(id, "ko", flower.ko, koAlt);
    if (flower.image) {
      const mediaTranslation = await this.client.from("media_asset_translations").upsert([
        { media_asset_id: flower.image.mediaAssetId, locale: "vi", alt_text: viAlt },
        { media_asset_id: flower.image.mediaAssetId, locale: "ko", alt_text: koAlt },
      ], { onConflict: "media_asset_id,locale" });
      if (mediaTranslation.error) fail("Không thể lưu alt text ảnh hoa", mediaTranslation.error);
    }
    if (wasPublished) {
      const restored = await this.client.from("flower_stems").update({ visibility: "PUBLISHED" }).eq("id", id);
      if (restored.error) fail("Nội dung đã lưu nhưng loại hoa chưa thể xuất bản lại", restored.error);
    }
    const saved = await this.getFlower(id);
    if (!saved) throw new Error("Loại hoa đã lưu nhưng không thể tải lại.");
    return saved;
  }

  async setFlowerVisibility(id: string, visibility: VisibilityStatus) {
    const { error } = await this.client.from("flower_stems").update({ visibility }).eq("id", id);
    if (error) fail("Không thể cập nhật trạng thái loại hoa", error);
  }

  async uploadFlowerImage(flower: AdminFlowerDraft, file: File, viAlt: string, koAlt: string): Promise<AdminFlowerImage> {
    if (!flower.id) throw new Error("Hãy lưu bản nháp trước khi tải ảnh.");
    const extension = validateProductImage(file);
    const assetId = crypto.randomUUID();
    const path = `builder/flowers/${flower.id}/${assetId}.${extension}`;
    const upload = await this.client.storage.from("public-media").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) fail("Không thể tải ảnh hoa lên Storage", upload.error);
    let mediaInserted = false;
    try {
      const media = await this.client.from("media_assets").insert({
        id: assetId, storage_bucket: "public-media", storage_path: path, access: "PUBLIC",
        mime_type: file.type, byte_size: file.size, uploaded_by: await profileId(this.client),
      });
      if (media.error) fail("Không thể lưu metadata ảnh hoa", media.error);
      mediaInserted = true;
      const safeViAlt = viAlt.trim() || flower.vi.name.trim() || "Hoa Luméa";
      const safeKoAlt = koAlt.trim() || flower.ko.name.trim() || "Luméa 꽃";
      const trans = await this.client.from("media_asset_translations").insert([
        { media_asset_id: assetId, locale: "vi", alt_text: safeViAlt },
        { media_asset_id: assetId, locale: "ko", alt_text: safeKoAlt },
      ]);
      if (trans.error) fail("Không thể lưu alt text ảnh hoa", trans.error);
      const attach = await this.client.from("flower_stems").update({ media_asset_id: assetId }).eq("id", flower.id);
      if (attach.error) fail("Không thể gắn ảnh vào loại hoa", attach.error);
      return {
        mediaAssetId: assetId, storagePath: path,
        url: this.client.storage.from("public-media").getPublicUrl(path).data.publicUrl,
        viAlt: safeViAlt, koAlt: safeKoAlt,
      };
    } catch (error) {
      if (mediaInserted) await this.client.from("media_assets").delete().eq("id", assetId);
      await this.client.storage.from("public-media").remove([path]);
      throw error;
    }
  }

  async listWrappingOptions(): Promise<AdminWrappingOptionDraft[]> {
    const { data, error } = await this.client.from("wrapping_options").select(`
      id, stable_code, visibility, price_modifier_amount, sort_order, updated_at,
      wrapping_option_translations(locale, name, description),
      wrapping_option_variants(wrapping_variant_id, active)
    `).order("sort_order");
    if (error) fail("Không thể tải kiểu gói", error);
    return (data ?? []).map((row) => ({
      id: row.id, stableCode: row.stable_code, visibility: row.visibility,
      priceModifier: row.price_modifier_amount, sortOrder: row.sort_order,
      vi: translation(row.wrapping_option_translations, "vi"),
      ko: translation(row.wrapping_option_translations, "ko"),
      compatibleVariantIds: row.wrapping_option_variants.filter((item) => item.active).map((item) => item.wrapping_variant_id),
      updatedAt: row.updated_at,
    }));
  }

  async getWrappingOption(id: string) {
    return (await this.listWrappingOptions()).find((option) => option.id === id) ?? null;
  }

  async saveWrappingOption(option: AdminWrappingOptionDraft) {
    let id = option.id;
    const wasPublished = option.visibility === "PUBLISHED";
    if (!id) {
      const created = await this.client.from("wrapping_options").insert({
        stable_code: option.stableCode.trim(), visibility: "DRAFT", price_modifier_amount: option.priceModifier ?? 0, sort_order: option.sortOrder,
      }).select("id").single();
      if (created.error || !created.data) fail("Không thể tạo kiểu gói", created.error);
      id = created.data.id;
    } else {
      if (wasPublished) {
        const hidden = await this.client.from("wrapping_options").update({ visibility: "HIDDEN" }).eq("id", id);
        if (hidden.error) fail("Không thể đưa kiểu gói về trạng thái an toàn", hidden.error);
      }
      const updated = await this.client.from("wrapping_options").update({
        stable_code: option.stableCode.trim(), price_modifier_amount: option.priceModifier ?? 0, sort_order: option.sortOrder,
      }).eq("id", id);
      if (updated.error) fail("Không thể cập nhật kiểu gói", updated.error);
    }
    const translations = await this.client.from("wrapping_option_translations").upsert([
      { wrapping_option_id: id, locale: "vi", name: option.vi.name.trim(), description: option.vi.description.trim() || null },
      { wrapping_option_id: id, locale: "ko", name: option.ko.name.trim(), description: option.ko.description.trim() || null },
    ], { onConflict: "wrapping_option_id,locale" });
    if (translations.error) fail("Không thể lưu nội dung kiểu gói", translations.error);
    const removed = await this.client.from("wrapping_option_variants").delete().eq("wrapping_option_id", id);
    if (removed.error) fail("Không thể cập nhật màu tương thích", removed.error);
    if (option.compatibleVariantIds.length) {
      const compatibility = await this.client.from("wrapping_option_variants").insert(option.compatibleVariantIds.map((variantId, index) => ({
        wrapping_option_id: id, wrapping_variant_id: variantId, active: true, sort_order: index * 10,
      })));
      if (compatibility.error) fail("Không thể lưu màu tương thích", compatibility.error);
    }
    if (wasPublished) {
      const restored = await this.client.from("wrapping_options").update({ visibility: "PUBLISHED" }).eq("id", id);
      if (restored.error) fail("Nội dung đã lưu nhưng kiểu gói chưa thể xuất bản lại", restored.error);
    }
    const saved = await this.getWrappingOption(id);
    if (!saved) throw new Error("Kiểu gói đã lưu nhưng không thể tải lại.");
    return saved;
  }

  async setWrappingOptionVisibility(id: string, visibility: VisibilityStatus) {
    const { error } = await this.client.from("wrapping_options").update({ visibility }).eq("id", id);
    if (error) fail("Không thể cập nhật trạng thái kiểu gói", error);
  }

  async listWrappingVariants(): Promise<AdminWrappingVariantDraft[]> {
    const { data, error } = await this.client.from("wrapping_variants").select(`
      id, stable_code, visibility, price_modifier_amount, swatch_value, sort_order, updated_at,
      wrapping_variant_translations(locale, name, description)
    `).order("sort_order");
    if (error) fail("Không thể tải màu gói", error);
    return (data ?? []).map((row) => ({
      id: row.id, stableCode: row.stable_code, visibility: row.visibility,
      priceModifier: row.price_modifier_amount, swatch: row.swatch_value, sortOrder: row.sort_order,
      vi: translation(row.wrapping_variant_translations, "vi"),
      ko: translation(row.wrapping_variant_translations, "ko"), updatedAt: row.updated_at,
    }));
  }

  async getWrappingVariant(id: string) {
    return (await this.listWrappingVariants()).find((variant) => variant.id === id) ?? null;
  }

  async saveWrappingVariant(variant: AdminWrappingVariantDraft) {
    let id = variant.id;
    const wasPublished = variant.visibility === "PUBLISHED";
    if (!id) {
      const created = await this.client.from("wrapping_variants").insert({
        stable_code: variant.stableCode.trim(), visibility: "DRAFT", price_modifier_amount: variant.priceModifier ?? 0,
        swatch_value: variant.swatch.trim(), sort_order: variant.sortOrder,
      }).select("id").single();
      if (created.error || !created.data) fail("Không thể tạo màu gói", created.error);
      id = created.data.id;
    } else {
      if (wasPublished) {
        const hidden = await this.client.from("wrapping_variants").update({ visibility: "HIDDEN" }).eq("id", id);
        if (hidden.error) fail("Không thể đưa màu gói về trạng thái an toàn", hidden.error);
      }
      const updated = await this.client.from("wrapping_variants").update({
        stable_code: variant.stableCode.trim(), price_modifier_amount: variant.priceModifier ?? 0,
        swatch_value: variant.swatch.trim(), sort_order: variant.sortOrder,
      }).eq("id", id);
      if (updated.error) fail("Không thể cập nhật màu gói", updated.error);
    }
    const translations = await this.client.from("wrapping_variant_translations").upsert([
      { wrapping_variant_id: id, locale: "vi", name: variant.vi.name.trim(), description: variant.vi.description.trim() || null },
      { wrapping_variant_id: id, locale: "ko", name: variant.ko.name.trim(), description: variant.ko.description.trim() || null },
    ], { onConflict: "wrapping_variant_id,locale" });
    if (translations.error) fail("Không thể lưu nội dung màu gói", translations.error);
    if (wasPublished) {
      const restored = await this.client.from("wrapping_variants").update({ visibility: "PUBLISHED" }).eq("id", id);
      if (restored.error) fail("Nội dung đã lưu nhưng màu gói chưa thể xuất bản lại", restored.error);
    }
    const saved = await this.getWrappingVariant(id);
    if (!saved) throw new Error("Màu gói đã lưu nhưng không thể tải lại.");
    return saved;
  }

  async setWrappingVariantVisibility(id: string, visibility: VisibilityStatus) {
    const { error } = await this.client.from("wrapping_variants").update({ visibility }).eq("id", id);
    if (error) fail("Không thể cập nhật trạng thái màu gói", error);
  }
}

export function createAdminBuilderRepository() {
  return new SupabaseAdminBuilderRepository();
}
