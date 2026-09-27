import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePublicSupabaseClient } from "../../../lib/supabase";
import type { Database } from "../../../types/database.generated";
import type { Locale } from "../../../types/content";
import type {
  CatalogProductFilters,
  CatalogProductRecord,
  CatalogRepository,
} from "./catalogRepository";

const PRODUCT_SELECT = `
  id,
  stable_code,
  slug,
  product_type,
  availability,
  same_day_eligible,
  featured,
  bestseller,
  sort_order,
  product_translations(locale, name, short_description, description, composition, seo_title, seo_description),
  product_variants(id, stable_code, price_amount, active, sort_order, product_variant_translations(locale, name, description)),
  product_images(id, role, active, sort_order, media_assets(id, storage_bucket, storage_path, access, status, media_asset_translations(locale, alt_text, caption))),
  product_occasions(sort_order, occasions(stable_code, visibility, archived_at, sort_order, occasion_translations(locale, name, description))),
  product_tones(active, sort_order, tones(stable_code, swatch_value, visibility, archived_at, tone_translations(locale, name, description)))
` as const;

type TranslationRow = { locale: Locale };

function pickTranslation<T extends TranslationRow>(translations: T[], locale: Locale) {
  return translations.find((translation) => translation.locale === locale)
    ?? translations.find((translation) => translation.locale === "vi")
    ?? null;
}

function matchesFilters(product: CatalogProductRecord, filters?: CatalogProductFilters) {
  if (!filters) return true;
  if (filters.availability && product.availability !== filters.availability) return false;
  if (filters.sameDayEligible !== undefined && product.sameDayEligible !== filters.sameDayEligible) return false;
  if (filters.occasionCode && !product.occasionCodes.includes(filters.occasionCode)) return false;
  return true;
}

type ProductQueryRow = Awaited<ReturnType<typeof loadProductRows>>[number];

async function loadProductRows(client: SupabaseClient<Database>, slug?: string) {
  let query = client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("visibility", "PUBLISHED")
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .limit(100);

  if (slug) query = query.eq("slug", slug).limit(1);

  const { data, error } = await query;
  if (error) throw new Error(`Unable to load the published catalog (${error.code}).`);
  return data;
}

function mapProduct(
  client: SupabaseClient<Database>,
  product: ProductQueryRow,
  locale: Locale,
): CatalogProductRecord | null {
  const translation = pickTranslation(product.product_translations, locale);
  if (!translation) return null;

  const variants = product.product_variants
    .filter((variant) => variant.active)
    .map((variant) => {
      const variantTranslation = pickTranslation(variant.product_variant_translations, locale);
      if (!variantTranslation) return null;
      return {
        id: variant.id,
        stableCode: variant.stable_code,
        name: variantTranslation.name,
        description: variantTranslation.description,
        priceAmount: variant.price_amount,
        sortOrder: variant.sort_order,
      };
    })
    .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  if (variants.length === 0) return null;

  const images = product.product_images
    .filter((image) => image.active)
    .map((image) => {
      const media = image.media_assets;
      if (
        !media
        || media.storage_bucket !== "public-media"
        || media.access !== "PUBLIC"
        || media.status !== "ACTIVE"
      ) return null;
      const mediaTranslation = pickTranslation(media.media_asset_translations, locale);
      if (!mediaTranslation) return null;
      const { publicUrl } = client.storage.from(media.storage_bucket).getPublicUrl(media.storage_path).data;
      return {
        id: media.id,
        url: publicUrl,
        altText: mediaTranslation.alt_text,
        caption: mediaTranslation.caption,
        role: image.role,
        sortOrder: image.sort_order,
      };
    })
    .filter((image): image is NonNullable<typeof image> => Boolean(image))
    .sort((left, right) => {
      if (left.role !== right.role) return left.role === "PRIMARY" ? -1 : 1;
      return left.sortOrder - right.sortOrder;
    });

  if (!images.some((image) => image.role === "PRIMARY")) return null;

  const tones = product.product_tones
    .filter((relation) => relation.active)
    .map((relation) => {
      const tone = relation.tones;
      if (!tone || tone.visibility !== "PUBLISHED" || tone.archived_at) return null;
      const toneTranslation = pickTranslation(tone.tone_translations, locale);
      if (!toneTranslation) return null;
      return {
        stableCode: tone.stable_code,
        name: toneTranslation.name,
        swatchValue: tone.swatch_value,
        sortOrder: relation.sort_order,
      };
    })
    .filter((tone): tone is NonNullable<typeof tone> => Boolean(tone))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const occasions = product.product_occasions
    .map((relation) => {
      const occasion = relation.occasions;
      if (!occasion || occasion.visibility !== "PUBLISHED" || occasion.archived_at) return null;
      const occasionTranslation = pickTranslation(occasion.occasion_translations, locale);
      if (!occasionTranslation) return null;
      return {
        stableCode: occasion.stable_code,
        name: occasionTranslation.name,
        sortOrder: occasion.sort_order,
      };
    })
    .filter((occasion): occasion is NonNullable<typeof occasion> => Boolean(occasion))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    id: product.id,
    stableCode: product.stable_code,
    slug: product.slug,
    productType: product.product_type,
    availability: product.availability,
    sameDayEligible: product.same_day_eligible,
    featured: product.featured,
    bestseller: product.bestseller,
    sortOrder: product.sort_order,
    name: translation.name,
    shortDescription: translation.short_description,
    description: translation.description,
    composition: translation.composition,
    seoTitle: translation.seo_title,
    seoDescription: translation.seo_description,
    startingPriceAmount: Math.min(...variants.map((variant) => variant.priceAmount)),
    variants,
    images,
    occasionCodes: occasions.map((occasion) => occasion.stableCode),
    occasions,
    tones,
  };
}

export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly providedClient?: SupabaseClient<Database>) {}

  private get client() {
    return this.providedClient ?? requirePublicSupabaseClient();
  }

  async listPublishedProducts(locale: Locale, filters?: CatalogProductFilters) {
    const rows = await loadProductRows(this.client);
    return rows
      .map((row) => mapProduct(this.client, row, locale))
      .filter((product): product is CatalogProductRecord => Boolean(product))
      .filter((product) => matchesFilters(product, filters));
  }

  async getPublishedProductBySlug(slug: string, locale: Locale) {
    const [row] = await loadProductRows(this.client, slug);
    return row ? mapProduct(this.client, row, locale) : null;
  }
}

export function createSupabaseCatalogRepository() {
  return new SupabaseCatalogRepository();
}
