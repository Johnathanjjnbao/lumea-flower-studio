import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseClient } from "../../../lib/supabase";
import type { Database } from "../../../types/database.generated";
import { emptyHomepageCopy, homepageSectionKeys, type HomepageSectionCopy, type HomepageSectionKey } from "../../homepage/types";
import type { AdminHomepageFeature, AdminHomepageMedia, AdminHomepageSection, AdminHomepageSnapshot } from "../types";
import { discardUploadedPublicMediaAsset, updatePublicMediaCopy, uploadPublicMediaAsset } from "./adminMediaService";

const SAFE_CTA_TARGETS = new Set(["/flowers", "/create-bouquet", "/flowers?sameDay=true", "#best-sellers", "#florist-choice", "#custom", "#gallery", "#visit"]);

function fail(message: string, error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null;
  throw new Error(code ? `${message} (${code}).` : message);
}

function isSectionKey(value: string): value is HomepageSectionKey {
  return (homepageSectionKeys as readonly string[]).includes(value);
}

function copyFromRow(row: {
  eyebrow: string | null; title_line_one: string; title_line_two: string | null; body: string | null; note: string | null;
  primary_cta_label: string | null; secondary_cta_label: string | null; secondary_heading: string | null; secondary_body: string | null;
  detail_one_label: string | null; detail_one_value: string | null; detail_two_label: string | null; detail_two_value: string | null;
} | undefined): HomepageSectionCopy {
  if (!row) return emptyHomepageCopy();
  return {
    eyebrow: row.eyebrow ?? "", titleOne: row.title_line_one, titleTwo: row.title_line_two ?? "", body: row.body ?? "", note: row.note ?? "",
    primaryCtaLabel: row.primary_cta_label ?? "", secondaryCtaLabel: row.secondary_cta_label ?? "",
    secondaryHeading: row.secondary_heading ?? "", secondaryBody: row.secondary_body ?? "",
    detailOneLabel: row.detail_one_label ?? "", detailOneValue: row.detail_one_value ?? "",
    detailTwoLabel: row.detail_two_label ?? "", detailTwoValue: row.detail_two_value ?? "",
  };
}

function translationPayload(sectionId: string, locale: "vi" | "ko", copy: HomepageSectionCopy) {
  const nullable = (value: string) => value.trim() || null;
  return {
    homepage_section_id: sectionId, locale, eyebrow: nullable(copy.eyebrow), title_line_one: copy.titleOne.trim(), title_line_two: nullable(copy.titleTwo),
    body: nullable(copy.body), note: nullable(copy.note), primary_cta_label: nullable(copy.primaryCtaLabel), secondary_cta_label: nullable(copy.secondaryCtaLabel),
    secondary_heading: nullable(copy.secondaryHeading), secondary_body: nullable(copy.secondaryBody), detail_one_label: nullable(copy.detailOneLabel),
    detail_one_value: nullable(copy.detailOneValue), detail_two_label: nullable(copy.detailTwoLabel), detail_two_value: nullable(copy.detailTwoValue),
  };
}

export interface AdminHomepageRepository {
  getHomepage(): Promise<AdminHomepageSnapshot>;
  saveSection(section: AdminHomepageSection): Promise<void>;
  saveFeatures(features: AdminHomepageFeature[]): Promise<void>;
  replaceCuration(sectionId: string, productIds: string[]): Promise<void>;
  updateMediaCopy(media: AdminHomepageMedia): Promise<void>;
  uploadSectionImage(section: AdminHomepageSection, slotKey: string, file: File, copy: { viAlt: string; koAlt: string; viCaption?: string; koCaption?: string }, sortOrder?: number): Promise<void>;
  uploadFeatureImage(section: AdminHomepageSection, feature: AdminHomepageFeature, file: File, viAlt: string, koAlt: string): Promise<void>;
  deactivateMedia(mediaId: string): Promise<void>;
  reorderMedia(media: AdminHomepageMedia[]): Promise<void>;
}

export class SupabaseAdminHomepageRepository implements AdminHomepageRepository {
  constructor(private readonly client: SupabaseClient<Database> = requireSupabaseClient()) {}

  async getHomepage(): Promise<AdminHomepageSnapshot> {
    const sectionsResult = await this.client.from("homepage_sections").select("id, section_key, enabled, display_order, primary_cta_target, secondary_cta_target").order("display_order");
    if (sectionsResult.error) fail("Không thể tải cấu hình Homepage", sectionsResult.error);
    const sectionRows = (sectionsResult.data ?? []).filter((row) => isSectionKey(row.section_key));
    const ids = sectionRows.map((row) => row.id);
    const [translations, mediaResult, featureResult, curationResult, productsResult] = await Promise.all([
      this.client.from("homepage_section_translations").select("homepage_section_id, locale, eyebrow, title_line_one, title_line_two, body, note, primary_cta_label, secondary_cta_label, secondary_heading, secondary_body, detail_one_label, detail_one_value, detail_two_label, detail_two_value").in("homepage_section_id", ids),
      this.client.from("homepage_section_media").select("id, homepage_section_id, media_asset_id, slot_key, sort_order, active, media_assets(storage_bucket, storage_path, status, media_asset_translations(locale, alt_text, caption))").in("homepage_section_id", ids).order("sort_order"),
      this.client.from("homepage_feature_items").select("id, homepage_section_id, item_key, media_asset_id, sort_order, active, homepage_feature_item_translations(locale, label, title, body), media_assets(storage_bucket, storage_path, status, media_asset_translations(locale, alt_text))").in("homepage_section_id", ids).order("sort_order"),
      this.client.from("homepage_product_curations").select("homepage_section_id, product_id, sort_order, active").in("homepage_section_id", ids).order("sort_order"),
      this.client.from("products").select("id, slug, product_translations(locale, name), product_images(role, active, media_assets(storage_bucket, storage_path, status))").eq("visibility", "PUBLISHED").is("archived_at", null).order("sort_order"),
    ]);
    if (translations.error) fail("Không thể tải nội dung Homepage", translations.error);
    if (mediaResult.error) fail("Không thể tải media Homepage", mediaResult.error);
    if (featureResult.error) fail("Không thể tải nội dung Why Luméa", featureResult.error);
    if (curationResult.error) fail("Không thể tải Best Sellers", curationResult.error);
    if (productsResult.error) fail("Không thể tải danh sách Product đã publish", productsResult.error);

    const sections = sectionRows.map((row): AdminHomepageSection => {
      const sectionMedia = (mediaResult.data ?? []).filter((item) => item.homepage_section_id === row.id).map((item): AdminHomepageMedia => {
        const source = item.media_assets;
        const vi = source?.media_asset_translations.find((translation) => translation.locale === "vi");
        const ko = source?.media_asset_translations.find((translation) => translation.locale === "ko");
        return {
          id: item.id, sectionId: item.homepage_section_id, mediaAssetId: item.media_asset_id, slotKey: item.slot_key, active: item.active, sortOrder: item.sort_order,
          storagePath: source?.storage_path ?? "", url: source ? this.client.storage.from(source.storage_bucket).getPublicUrl(source.storage_path).data.publicUrl : "",
          viAlt: vi?.alt_text ?? "", koAlt: ko?.alt_text ?? "", viCaption: vi?.caption ?? "", koCaption: ko?.caption ?? "",
        };
      });
      const features = (featureResult.data ?? []).filter((item) => item.homepage_section_id === row.id).map((item): AdminHomepageFeature => {
        const vi = item.homepage_feature_item_translations.find((translation) => translation.locale === "vi");
        const ko = item.homepage_feature_item_translations.find((translation) => translation.locale === "ko");
        const viMedia = item.media_assets?.media_asset_translations.find((translation) => translation.locale === "vi");
        const koMedia = item.media_assets?.media_asset_translations.find((translation) => translation.locale === "ko");
        return {
          id: item.id, itemKey: item.item_key, mediaAssetId: item.media_asset_id, sortOrder: item.sort_order, active: item.active,
          imageUrl: item.media_assets ? this.client.storage.from(item.media_assets.storage_bucket).getPublicUrl(item.media_assets.storage_path).data.publicUrl : null,
          vi: { label: vi?.label ?? "", title: vi?.title ?? "", body: vi?.body ?? "" }, ko: { label: ko?.label ?? "", title: ko?.title ?? "", body: ko?.body ?? "" },
          viAlt: viMedia?.alt_text ?? "", koAlt: koMedia?.alt_text ?? "",
        };
      });
      return {
        id: row.id, key: row.section_key as HomepageSectionKey, enabled: row.enabled, primaryCtaTarget: row.primary_cta_target, secondaryCtaTarget: row.secondary_cta_target,
        vi: copyFromRow((translations.data ?? []).find((item) => item.homepage_section_id === row.id && item.locale === "vi")),
        ko: copyFromRow((translations.data ?? []).find((item) => item.homepage_section_id === row.id && item.locale === "ko")),
        media: sectionMedia, features,
        curatedProductIds: (curationResult.data ?? []).filter((item) => item.homepage_section_id === row.id && item.active).map((item) => item.product_id),
      };
    });
    const products = (productsResult.data ?? []).map((row) => {
      const primary = row.product_images.find((image) => image.active && image.role === "PRIMARY")?.media_assets;
      return {
        id: row.id, slug: row.slug, name: row.product_translations.find((translation) => translation.locale === "vi")?.name ?? row.slug,
        imageUrl: primary && primary.status === "ACTIVE" ? this.client.storage.from(primary.storage_bucket).getPublicUrl(primary.storage_path).data.publicUrl : null,
      };
    });
    return { sections, products };
  }

  async saveSection(section: AdminHomepageSection) {
    if (!section.vi.titleOne.trim() || !section.ko.titleOne.trim()) throw new Error("Tiêu đề VI và KO không được để trống.");
    for (const target of [section.primaryCtaTarget, section.secondaryCtaTarget]) {
      if (target && !SAFE_CTA_TARGETS.has(target)) throw new Error("CTA chỉ được dùng destination nội bộ đã được Luméa cho phép.");
    }
    const sectionUpdate = await this.client.from("homepage_sections").update({
      enabled: section.key === "hero" ? true : section.enabled,
      primary_cta_target: section.primaryCtaTarget,
      secondary_cta_target: section.secondaryCtaTarget,
    }).eq("id", section.id);
    if (sectionUpdate.error) fail("Không thể lưu trạng thái section", sectionUpdate.error);
    const copyUpdate = await this.client.from("homepage_section_translations").upsert([
      translationPayload(section.id, "vi", section.vi), translationPayload(section.id, "ko", section.ko),
    ], { onConflict: "homepage_section_id,locale" });
    if (copyUpdate.error) fail("Không thể lưu nội dung VI/KO", copyUpdate.error);
  }

  async saveFeatures(features: AdminHomepageFeature[]) {
    for (const feature of features) {
      if (!feature.vi.title.trim() || !feature.ko.title.trim()) throw new Error("Mỗi điểm khác biệt cần tiêu đề VI và KO.");
      const state = await this.client.from("homepage_feature_items").update({ active: feature.active, sort_order: feature.sortOrder }).eq("id", feature.id);
      if (state.error) fail("Không thể lưu trạng thái điểm khác biệt", state.error);
      const copy = await this.client.from("homepage_feature_item_translations").upsert([
        { homepage_feature_item_id: feature.id, locale: "vi", label: feature.vi.label.trim() || null, title: feature.vi.title.trim(), body: feature.vi.body.trim() || null },
        { homepage_feature_item_id: feature.id, locale: "ko", label: feature.ko.label.trim() || null, title: feature.ko.title.trim(), body: feature.ko.body.trim() || null },
      ], { onConflict: "homepage_feature_item_id,locale" });
      if (copy.error) fail("Không thể lưu nội dung điểm khác biệt", copy.error);
      if (feature.mediaAssetId) await updatePublicMediaCopy(this.client, feature.mediaAssetId, { viAlt: feature.viAlt, koAlt: feature.koAlt });
    }
  }

  async replaceCuration(sectionId: string, productIds: string[]) {
    const result = await this.client.rpc("replace_homepage_product_curations", { target_section_id: sectionId, target_product_ids: productIds });
    if (result.error) fail("Không thể lưu Best Sellers", result.error);
  }

  async updateMediaCopy(media: AdminHomepageMedia) {
    await updatePublicMediaCopy(this.client, media.mediaAssetId, { viAlt: media.viAlt, koAlt: media.koAlt, viCaption: media.viCaption, koCaption: media.koCaption });
  }

  async uploadSectionImage(section: AdminHomepageSection, slotKey: string, file: File, copy: { viAlt: string; koAlt: string; viCaption?: string; koCaption?: string }, sortOrder = 0) {
    const uploaded = await uploadPublicMediaAsset(this.client, file, { pathPrefix: `homepage/${section.key}`, viAlt: copy.viAlt, koAlt: copy.koAlt, fallbackVi: "Ảnh trang chủ Luméa", fallbackKo: "Luméa 홈페이지 이미지" });
    try {
      if (copy.viCaption || copy.koCaption) await updatePublicMediaCopy(this.client, uploaded.mediaAssetId, copy);
      const relation = await this.client.from("homepage_section_media").upsert({
        homepage_section_id: section.id, media_asset_id: uploaded.mediaAssetId, slot_key: slotKey, sort_order: sortOrder, active: true,
      }, { onConflict: "homepage_section_id,slot_key" });
      if (relation.error) fail("Không thể gắn ảnh vào Homepage", relation.error);
    } catch (error) {
      await discardUploadedPublicMediaAsset(this.client, uploaded);
      throw error;
    }
  }

  async uploadFeatureImage(section: AdminHomepageSection, feature: AdminHomepageFeature, file: File, viAlt: string, koAlt: string) {
    const uploaded = await uploadPublicMediaAsset(this.client, file, { pathPrefix: `homepage/${section.key}`, viAlt, koAlt, fallbackVi: "Hình ảnh Luméa", fallbackKo: "Luméa 이미지" });
    try {
      const relation = await this.client.from("homepage_feature_items").update({ media_asset_id: uploaded.mediaAssetId }).eq("id", feature.id);
      if (relation.error) fail("Không thể gắn ảnh vào điểm khác biệt", relation.error);
    } catch (error) {
      await discardUploadedPublicMediaAsset(this.client, uploaded);
      throw error;
    }
  }

  async deactivateMedia(mediaId: string) {
    const result = await this.client.from("homepage_section_media").update({ active: false }).eq("id", mediaId);
    if (result.error) fail("Không thể gỡ ảnh khỏi Homepage", result.error);
  }

  async reorderMedia(media: AdminHomepageMedia[]) {
    if (!media.length) return;
    const result = await this.client.rpc("reorder_homepage_section_media", {
      target_media_ids: media.map((item) => item.id),
      target_section_id: media[0].sectionId,
    });
    if (result.error) fail("Không thể lưu thứ tự ảnh", result.error);
  }
}

export function createAdminHomepageRepository() {
  return new SupabaseAdminHomepageRepository();
}
