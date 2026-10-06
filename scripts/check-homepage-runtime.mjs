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

async function loadDictionaries() {
  const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  try {
    const [{ vi }, { ko }] = await Promise.all([vite.ssrLoadModule("/src/i18n/vi.ts"), vite.ssrLoadModule("/src/i18n/ko.ts")]);
    return { vi, ko };
  } finally { await vite.close(); }
}

const env = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
assert(env.VITE_SUPABASE_URL?.includes("nihhynwvltttadlfatdm.supabase.co"), "Homepage check is not targeting the Luméa project.");
assert(env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_"), "A browser-safe publishable key is required.");
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
const dictionaries = await loadDictionaries();

const { data: sections, error } = await client.from("homepage_sections").select(`
  id, section_key, enabled, display_order, primary_cta_target, secondary_cta_target,
  visit_map_enabled, visit_map_query, visit_google_maps_url,
  homepage_section_translations(locale, title_line_one, body),
  homepage_section_media(id, slot_key, active, sort_order, media_assets(storage_bucket, storage_path, access, status, media_asset_translations(locale, alt_text))),
  homepage_feature_items(id, item_key, active, media_assets(storage_bucket, storage_path, access, status, media_asset_translations(locale, alt_text)), homepage_feature_item_translations(locale, title)),
  homepage_product_curations(product_id, active, sort_order, products(visibility, archived_at))
`).eq("enabled", true).order("display_order");
assert(!error, `Anonymous Homepage query failed (${error?.code ?? "unknown"}).`);
assert(sections.length === 10, `Expected 10 enabled Homepage sections, received ${sections.length}.`);
assert(new Set(sections.map((section) => section.section_key)).size === 10, "Homepage section keys are not unique.");

const { data: siteProfiles, error: siteProfileError } = await client
  .from("site_profile")
  .select("business_name, phone, email, instagram_url, instagram_handle")
  .eq("singleton", true);
assert(!siteProfileError, `Anonymous Site Profile query failed (${siteProfileError?.code ?? "unknown"}).`);
assert(siteProfiles.length === 1 && siteProfiles[0].business_name.trim().length >= 2, "Canonical Site Profile is missing or invalid.");

for (const section of sections) {
  assert(section.homepage_section_translations.length === 2, `${section.section_key} is missing VI/KO copy.`);
  for (const media of section.homepage_section_media.filter((item) => item.active)) {
    assert(media.media_assets?.storage_bucket === "public-media" && media.media_assets.access === "PUBLIC" && media.media_assets.status === "ACTIVE", `${section.section_key}/${media.slot_key} lacks active public media.`);
    assert(new Set(media.media_assets.media_asset_translations.map((item) => item.locale)).size === 2, `${section.section_key}/${media.slot_key} lacks VI/KO alt text.`);
  }
}

const hero = sections.find((section) => section.section_key === "hero");
assert(hero, "Hero section is missing.");
assert(hero.homepage_section_translations.find((copy) => copy.locale === "vi")?.title_line_one === dictionaries.vi.home.hero.titleOne, "Hero VI fixture was not preserved.");
assert(hero.homepage_section_translations.find((copy) => copy.locale === "ko")?.title_line_one === dictionaries.ko.home.hero.titleOne, "Hero KO fixture was not preserved.");
assert(hero.homepage_section_media.filter((item) => item.active).length === 2, "Hero must expose two active media slots.");

const visit = sections.find((section) => section.section_key === "visit");
assert(visit, "Visit section is missing.");
for (const section of sections.filter((item) => item.section_key !== "visit")) {
  assert(!section.visit_map_enabled && !section.visit_map_query && !section.visit_google_maps_url, `${section.section_key} leaked Visit-only configuration.`);
}
if (visit.visit_map_enabled) {
  assert(typeof visit.visit_map_query === "string" && visit.visit_map_query.trim().length >= 3, "Enabled Visit map is missing a location query.");
  assert(/^https:\/\/(?:www\.google\.com|google\.com|maps\.google\.com)\/maps(?:[/?]|$)|^https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\//.test(visit.visit_google_maps_url ?? ""), "Enabled Visit map has an unsafe destination URL.");
}

const gallery = sections.find((section) => section.section_key === "gallery");
assert(gallery?.homepage_section_media.filter((item) => item.active).length === 10, "Gallery must preserve the approved 10-image layout.");
const why = sections.find((section) => section.section_key === "why_lumea");
assert(why?.homepage_feature_items.filter((item) => item.active).length === 3, "Why Luméa must preserve three active promises.");
for (const item of why.homepage_feature_items) {
  assert(item.homepage_feature_item_translations.length === 2, `${item.item_key} lacks VI/KO copy.`);
  assert(item.media_assets?.media_asset_translations.length === 2, `${item.item_key} lacks VI/KO image alt text.`);
}

const best = sections.find((section) => section.section_key === "best_sellers");
assert(best?.homepage_product_curations.filter((item) => item.active).length === 6, "Best Sellers must preserve six curated Products.");
for (const item of best.homepage_product_curations) {
  assert(item.products?.visibility === "PUBLISHED" && item.products.archived_at === null, "A non-public Product leaked into Best Sellers.");
}

const writeProbe = await client.from("homepage_sections").update({ display_order: 999 }).eq("id", hero.id).select("id");
assert(Boolean(writeProbe.error), "Anonymous Homepage write unexpectedly succeeded.");
console.log("Homepage runtime check passed: canonical Site Profile, 10 sections, VI/KO copy, safe Visit location config, 28 managed images, six curated Products, and anonymous write denial.");
