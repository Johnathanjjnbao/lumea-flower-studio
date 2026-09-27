import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const stateArg = process.argv.find((argument) => argument.startsWith("--state="));
const slugArg = process.argv.find((argument) => argument.startsWith("--slug="));
const expectedState = stateArg?.split("=")[1];
const slug = slugArg?.split("=")[1];
if (!slug || !["published", "private"].includes(expectedState)) {
  throw new Error("Usage: npm run check:admin-runtime -- --slug=<slug> --state=published|private");
}

const envText = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_")) {
  throw new Error("Missing browser-safe Supabase config.");
}

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client.from("products").select(`
  id, slug, visibility, availability, same_day_eligible,
  product_translations(locale, name),
  product_variants(price_amount, active, product_variant_translations(locale, name)),
  product_occasions(occasion_id),
  product_tones(tone_id, active),
  product_images(role, active, media_assets(storage_bucket, storage_path, status, media_asset_translations(locale, alt_text)))
`).eq("slug", slug).maybeSingle();
if (error) throw new Error(`Anonymous read failed unexpectedly (${error.code}).`);

if (expectedState === "private") {
  if (data) throw new Error("Hidden/archived Product is still anonymously readable.");
  console.log("Admin runtime public visibility: PASS (Product is private)");
  process.exit(0);
}

if (!data) throw new Error("Published Product is not anonymously readable.");
const locales = new Set(data.product_translations.map((translation) => translation.locale));
if (!locales.has("vi") || !locales.has("ko")) throw new Error("Published Product is missing VI/KO translations.");
const activeVariant = data.product_variants.find((variant) => variant.active && variant.price_amount === 789000);
if (!activeVariant) throw new Error("Expected active 789000 VND variant is missing.");
const variantLocales = new Set(activeVariant.product_variant_translations.map((translation) => translation.locale));
if (!variantLocales.has("vi") || !variantLocales.has("ko")) throw new Error("Variant is missing VI/KO labels.");
if (data.product_occasions.length !== 2 || data.product_tones.filter((relation) => relation.active).length !== 2) {
  throw new Error("Expected two occasions and two tones.");
}
const primary = data.product_images.find((image) => image.active && image.role === "PRIMARY");
if (!primary?.media_assets || primary.media_assets.storage_bucket !== "public-media" || primary.media_assets.status !== "ACTIVE") {
  throw new Error("Active public primary media is missing.");
}
const mediaLocales = new Set(primary.media_assets.media_asset_translations.map((translation) => translation.locale));
if (!mediaLocales.has("vi") || !mediaLocales.has("ko")) throw new Error("Primary media is missing VI/KO alt text.");
if (data.visibility !== "PUBLISHED" || data.availability !== "AVAILABLE" || !data.same_day_eligible) {
  throw new Error("Published Product lifecycle/availability values are incorrect.");
}
console.log("Admin runtime public visibility: PASS (published Product graph is complete)");
