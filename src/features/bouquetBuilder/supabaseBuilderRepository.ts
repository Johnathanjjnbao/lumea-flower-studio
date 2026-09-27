import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient } from "../../lib/supabase";
import type { Database } from "../../types/database.generated";
import type { Locale } from "../../types/content";
import type { BuilderRepository } from "./builderRepository";
import type { BouquetBuilderCatalog } from "./types";

type TranslationRow = { locale: Locale };

function pickTranslation<T extends TranslationRow>(translations: T[], locale: Locale) {
  return translations.find((translation) => translation.locale === locale)
    ?? translations.find((translation) => translation.locale === "vi")
    ?? null;
}

export class SupabaseBuilderRepository implements BuilderRepository {
  constructor(private readonly providedClient?: SupabaseClient<Database>) {}

  private get client() {
    return this.providedClient ?? requirePublicSupabaseClient();
  }

  async loadPublishedBuilder(locale: Locale): Promise<BouquetBuilderCatalog> {
    const [flowerResult, optionResult, variantResult, compatibilityResult] = await Promise.all([
      this.client.from("flower_stems").select(`
        id, stable_code, availability, price_per_stem_amount, sort_order,
        flower_stem_translations(locale, name, description, image_alt),
        media_assets(id, storage_bucket, storage_path, access, status)
      `).eq("visibility", "PUBLISHED").is("archived_at", null).order("sort_order"),
      this.client.from("wrapping_options").select(`
        id, stable_code, price_modifier_amount, sort_order,
        wrapping_option_translations(locale, name, description)
      `).eq("visibility", "PUBLISHED").is("archived_at", null).order("sort_order"),
      this.client.from("wrapping_variants").select(`
        id, stable_code, price_modifier_amount, swatch_value, sort_order,
        wrapping_variant_translations(locale, name, description)
      `).eq("visibility", "PUBLISHED").is("archived_at", null).order("sort_order"),
      this.client.from("wrapping_option_variants")
        .select("wrapping_option_id, wrapping_variant_id, price_modifier_amount, sort_order")
        .eq("active", true)
        .order("sort_order"),
    ]);

    const error = flowerResult.error ?? optionResult.error ?? variantResult.error ?? compatibilityResult.error;
    if (error) throw new Error(`Unable to load the live Builder catalog (${error.code}).`);

    const flowers = (flowerResult.data ?? []).map((row) => {
      const translation = pickTranslation(row.flower_stem_translations, locale);
      const media = row.media_assets;
      if (!translation || !media || media.access !== "PUBLIC" || media.status !== "ACTIVE" || media.storage_bucket !== "public-media") return null;
      const { publicUrl } = this.client.storage.from(media.storage_bucket).getPublicUrl(media.storage_path).data;
      return {
        id: row.id,
        stableCode: row.stable_code,
        name: translation.name,
        description: translation.description ?? "",
        imageUrl: publicUrl,
        imageAlt: translation.image_alt,
        pricePerStem: row.price_per_stem_amount,
        availability: row.availability,
        sortOrder: row.sort_order,
      };
    }).filter((flower): flower is NonNullable<typeof flower> => Boolean(flower));

    const wrappingVariants = (variantResult.data ?? []).map((row) => {
      const translation = pickTranslation(row.wrapping_variant_translations, locale);
      if (!translation) return null;
      return {
        id: row.id,
        stableCode: row.stable_code,
        name: translation.name,
        priceModifier: row.price_modifier_amount,
        swatch: row.swatch_value,
        sortOrder: row.sort_order,
      };
    }).filter((variant): variant is NonNullable<typeof variant> => Boolean(variant));

    const publicVariantIds = new Set(wrappingVariants.map((variant) => variant.id));
    const compatibilityRows = (compatibilityResult.data ?? []).filter((row) => publicVariantIds.has(row.wrapping_variant_id));
    const wrappingTypes = (optionResult.data ?? []).map((row) => {
      const translation = pickTranslation(row.wrapping_option_translations, locale);
      const compatible = compatibilityRows.filter((item) => item.wrapping_option_id === row.id);
      if (!translation || compatible.length === 0) return null;
      return {
        id: row.id,
        stableCode: row.stable_code,
        name: translation.name,
        description: translation.description ?? "",
        priceModifier: row.price_modifier_amount,
        compatibleVariantIds: compatible.map((item) => item.wrapping_variant_id),
        compatibilityPriceModifiers: Object.fromEntries(compatible.map((item) => [item.wrapping_variant_id, item.price_modifier_amount ?? 0])),
        sortOrder: row.sort_order,
      };
    }).filter((option): option is NonNullable<typeof option> => Boolean(option));

    return { flowers, wrappingTypes, wrappingVariants };
  }
}

export function createSupabaseBuilderRepository() {
  return new SupabaseBuilderRepository();
}
