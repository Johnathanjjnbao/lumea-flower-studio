import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient } from "../../../lib/supabase";
import type { Locale } from "../../../types/content";
import type { Database } from "../../../types/database.generated";
import { emptyHomepageCopy, homepageSectionKeys, type HomepageFeatureItem, type HomepageMedia, type HomepageSection, type HomepageSectionKey } from "../types";
import type { HomepageRepository } from "./homepageRepository";

function fail(context: string, error: { code?: string } | null) {
  throw new Error(`${context}${error?.code ? ` (${error.code})` : ""}`);
}

function isSectionKey(value: string): value is HomepageSectionKey {
  return (homepageSectionKeys as readonly string[]).includes(value);
}

export class SupabaseHomepageRepository implements HomepageRepository {
  constructor(private readonly client: SupabaseClient<Database> = requirePublicSupabaseClient()) {}

  async getHomepageSections(locale: Locale): Promise<HomepageSection[]> {
    const sectionsResult = await this.client
      .from("homepage_sections")
      .select("id, section_key, enabled, display_order, primary_cta_target, secondary_cta_target")
      .eq("enabled", true)
      .order("display_order");
    if (sectionsResult.error) fail("Không thể tải cấu trúc trang chủ", sectionsResult.error);

    const sectionRows = (sectionsResult.data ?? []).filter((row) => isSectionKey(row.section_key));
    const sectionIds = sectionRows.map((row) => row.id);
    if (!sectionIds.length) return [];

    const [translationResult, mediaResult, featureResult, curationResult] = await Promise.all([
      this.client
        .from("homepage_section_translations")
        .select("homepage_section_id, eyebrow, title_line_one, title_line_two, body, note, primary_cta_label, secondary_cta_label, secondary_heading, secondary_body, detail_one_label, detail_one_value, detail_two_label, detail_two_value")
        .eq("locale", locale)
        .in("homepage_section_id", sectionIds),
      this.client
        .from("homepage_section_media")
        .select("id, homepage_section_id, media_asset_id, slot_key, sort_order, active, media_assets!inner(storage_bucket, storage_path, access, status, media_asset_translations(locale, alt_text, caption))")
        .eq("active", true)
        .in("homepage_section_id", sectionIds)
        .order("sort_order"),
      this.client
        .from("homepage_feature_items")
        .select("id, homepage_section_id, item_key, media_asset_id, sort_order, active, homepage_feature_item_translations(locale, label, title, body), media_assets(storage_bucket, storage_path, access, status, media_asset_translations(locale, alt_text, caption))")
        .eq("active", true)
        .in("homepage_section_id", sectionIds)
        .order("sort_order"),
      this.client
        .from("homepage_product_curations")
        .select("homepage_section_id, product_id, sort_order, active")
        .eq("active", true)
        .in("homepage_section_id", sectionIds)
        .order("sort_order"),
    ]);

    if (translationResult.error) fail("Không thể tải nội dung trang chủ", translationResult.error);
    if (mediaResult.error) fail("Không thể tải ảnh trang chủ", mediaResult.error);
    if (featureResult.error) fail("Không thể tải nội dung giới thiệu", featureResult.error);
    if (curationResult.error) fail("Không thể tải tuyển chọn sản phẩm", curationResult.error);

    const mediaRows = mediaResult.data ?? [];
    const featureRows = featureResult.data ?? [];
    const curationRows = curationResult.data ?? [];

    const mapMedia = (row: (typeof mediaRows)[number]): HomepageMedia | null => {
      const media = row.media_assets;
      if (!media || media.access !== "PUBLIC" || media.status !== "ACTIVE" || media.storage_bucket !== "public-media") return null;
      const translation = media.media_asset_translations.find((item) => item.locale === locale);
      if (!translation) return null;
      return {
        id: row.id,
        mediaAssetId: row.media_asset_id,
        slotKey: row.slot_key,
        url: this.client.storage.from(media.storage_bucket).getPublicUrl(media.storage_path).data.publicUrl,
        altText: translation.alt_text,
        caption: translation.caption ?? "",
        sortOrder: row.sort_order,
        active: row.active,
      };
    };

    return sectionRows.map((row) => {
      const translation = (translationResult.data ?? []).find((item) => item.homepage_section_id === row.id);
      const copy = emptyHomepageCopy();
      if (translation) {
        Object.assign(copy, {
          eyebrow: translation.eyebrow ?? "",
          titleOne: translation.title_line_one,
          titleTwo: translation.title_line_two ?? "",
          body: translation.body ?? "",
          note: translation.note ?? "",
          primaryCtaLabel: translation.primary_cta_label ?? "",
          secondaryCtaLabel: translation.secondary_cta_label ?? "",
          secondaryHeading: translation.secondary_heading ?? "",
          secondaryBody: translation.secondary_body ?? "",
          detailOneLabel: translation.detail_one_label ?? "",
          detailOneValue: translation.detail_one_value ?? "",
          detailTwoLabel: translation.detail_two_label ?? "",
          detailTwoValue: translation.detail_two_value ?? "",
        });
      }

      const media = mediaRows
        .filter((item) => item.homepage_section_id === row.id)
        .map(mapMedia)
        .filter((item): item is HomepageMedia => item !== null);

      const features = featureRows
        .filter((item) => item.homepage_section_id === row.id)
        .map((item): HomepageFeatureItem | null => {
          const featureTranslation = item.homepage_feature_item_translations.find((candidate) => candidate.locale === locale);
          if (!featureTranslation) return null;
          const featureMedia = item.media_assets
            ? mapMedia({
                id: item.id,
                homepage_section_id: item.homepage_section_id,
                media_asset_id: item.media_asset_id ?? "",
                slot_key: item.item_key,
                sort_order: item.sort_order,
                active: item.active,
                media_assets: item.media_assets,
              })
            : null;
          return {
            id: item.id,
            itemKey: item.item_key,
            label: featureTranslation.label ?? "",
            title: featureTranslation.title,
            body: featureTranslation.body ?? "",
            media: featureMedia,
            sortOrder: item.sort_order,
            active: item.active,
          };
        })
        .filter((item): item is HomepageFeatureItem => item !== null);

      return {
        id: row.id,
        key: row.section_key as HomepageSectionKey,
        enabled: row.enabled,
        primaryCtaTarget: row.primary_cta_target,
        secondaryCtaTarget: row.secondary_cta_target,
        copy,
        media,
        features,
        curatedProductIds: curationRows
          .filter((item) => item.homepage_section_id === row.id)
          .map((item) => item.product_id),
      };
    });
  }
}

export function createSupabaseHomepageRepository() {
  return new SupabaseHomepageRepository();
}
