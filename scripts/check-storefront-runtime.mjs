import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { createServer } from "vite";

function parseEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadFixture() {
  const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  try {
    const [{ products }, { vi }, { ko }] = await Promise.all([
      vite.ssrLoadModule("/src/data/content.ts"),
      vite.ssrLoadModule("/src/i18n/vi.ts"),
      vite.ssrLoadModule("/src/i18n/ko.ts"),
    ]);
    return { products, vi, ko };
  } finally {
    await vite.close();
  }
}

const env = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
assert(env.VITE_SUPABASE_URL?.includes("nihhynwvltttadlfatdm.supabase.co"), "The storefront check is not targeting the Luméa project.");
assert(env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_"), "A browser-safe publishable key is required.");

const { products: fixtureProducts, vi, ko } = await loadFixture();
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

const { data, error } = await client.from("products").select(`
  stable_code, slug, visibility, availability, same_day_eligible, featured, bestseller, sort_order,
  product_translations(locale, name, short_description, description, composition),
  product_variants(stable_code, price_amount, active, sort_order, product_variant_translations(locale, name, description)),
  product_occasions(occasions(stable_code)),
  product_tones(active, tones(stable_code)),
  product_images(role, active, media_assets(storage_bucket, storage_path, access, status, media_asset_translations(locale, alt_text)))
`).eq("visibility", "PUBLISHED").is("archived_at", null).order("sort_order");

assert(!error, `Anonymous storefront query failed (${error?.code ?? "unknown"}).`);
assert(data.length === fixtureProducts.length, `Expected ${fixtureProducts.length} migrated Products, received ${data.length}.`);

for (const fixture of fixtureProducts) {
  const product = data.find((candidate) => candidate.stable_code === fixture.id);
  assert(product, `Missing migrated Product ${fixture.id}.`);
  assert(product.slug === fixture.slug, `Slug mismatch for ${fixture.id}.`);
  assert(product.visibility === "PUBLISHED", `${fixture.id} is not published.`);
  assert(product.availability === fixture.availability, `Availability mismatch for ${fixture.id}.`);
  assert(product.same_day_eligible === fixture.sameDayEligible, `Same-day mismatch for ${fixture.id}.`);
  assert(product.featured === Boolean(fixture.featured), `Featured mismatch for ${fixture.id}.`);
  assert(product.bestseller === (fixture.tag === "bestseller"), `Bestseller mismatch for ${fixture.id}.`);

  for (const [locale, dictionary] of [["vi", vi], ["ko", ko]]) {
    const translation = product.product_translations.find((item) => item.locale === locale);
    const expected = dictionary.products[fixture.id];
    assert(translation?.name === fixture.name, `${locale.toUpperCase()} name mismatch for ${fixture.id}.`);
    assert(translation?.short_description === expected.shortDescription, `${locale.toUpperCase()} short copy mismatch for ${fixture.id}.`);
    assert(translation?.description === expected.description, `${locale.toUpperCase()} description mismatch for ${fixture.id}.`);
    assert(JSON.stringify(translation?.composition) === JSON.stringify(expected.composition), `${locale.toUpperCase()} composition mismatch for ${fixture.id}.`);
  }

  assert(product.product_variants.length === fixture.sizes.length, `Variant count mismatch for ${fixture.id}.`);
  fixture.sizes.forEach((fixtureVariant) => {
    const variant = product.product_variants.find((candidate) => candidate.stable_code === fixtureVariant.id);
    assert(variant?.active, `Active ${fixtureVariant.id} variant missing for ${fixture.id}.`);
    // Admin-managed live prices are business source of truth and may intentionally diverge from seed fixtures.
    assert(Number.isSafeInteger(variant.price_amount) && variant.price_amount > 0, `Invalid live price for ${fixture.id}/${fixtureVariant.id}.`);
    assert(new Set(variant.product_variant_translations.map((item) => item.locale)).size === 2, `Variant translations missing for ${fixture.id}/${fixtureVariant.id}.`);
  });

  const occasionCodes = new Set(product.product_occasions.map((relation) => relation.occasions?.stable_code).filter(Boolean));
  fixture.occasionIds.forEach((code) => assert(occasionCodes.has(code), `Occasion ${code} missing for ${fixture.id}.`));
  const toneCodes = new Set(product.product_tones.filter((relation) => relation.active).map((relation) => relation.tones?.stable_code).filter(Boolean));
  fixture.tones.forEach((tone) => assert(toneCodes.has(tone.id), `Tone ${tone.id} missing for ${fixture.id}.`));

  const primary = product.product_images.find((image) => image.active && image.role === "PRIMARY");
  const media = primary?.media_assets;
  assert(media?.storage_bucket === "public-media" && media.access === "PUBLIC" && media.status === "ACTIVE", `Public primary media missing for ${fixture.id}.`);
  assert(new Set(media.media_asset_translations.map((item) => item.locale)).size === 2, `Media translations missing for ${fixture.id}.`);
}

const privateSlugs = ["step-9b-runtime-test-20260927"];
for (const slug of privateSlugs) {
  const probe = await client.from("products").select("id, slug, visibility").eq("slug", slug).maybeSingle();
  assert(!probe.error && !probe.data, `Private Product ${slug} leaked through anonymous RLS.`);
}

console.log(`Storefront runtime check passed: ${data.length}/${fixtureProducts.length} Products match VI/KO copy, variants, taxonomy, media, and public visibility rules.`);
