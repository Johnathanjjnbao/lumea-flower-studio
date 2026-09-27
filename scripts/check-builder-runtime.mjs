import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_publishable_")) {
  throw new Error("Missing browser-safe Supabase config.");
}

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const [flowers, options, variants, compatibility] = await Promise.all([
  client.from("flower_stems").select("id, stable_code, visibility, availability, price_per_stem_amount, flower_stem_translations(locale, name, image_alt), media_assets(storage_bucket, storage_path, access, status)").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_options").select("id, stable_code, visibility, price_modifier_amount, wrapping_option_translations(locale, name)").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_variants").select("id, stable_code, visibility, price_modifier_amount, swatch_value, wrapping_variant_translations(locale, name)").eq("visibility", "PUBLISHED").is("archived_at", null),
  client.from("wrapping_option_variants").select("wrapping_option_id, wrapping_variant_id, active").eq("active", true),
]);

for (const result of [flowers, options, variants, compatibility]) {
  if (result.error) throw new Error(`Anonymous Builder read failed (${result.error.code}).`);
}
if (flowers.data.length !== 8) throw new Error(`Expected 8 public flowers, received ${flowers.data.length}.`);
if (options.data.length !== 3) throw new Error(`Expected 3 public wrapping options, received ${options.data.length}.`);
if (variants.data.length !== 5) throw new Error(`Expected 5 public wrapping colors, received ${variants.data.length}.`);
if (compatibility.data.length !== 7) throw new Error(`Expected 7 public compatibility pairs, received ${compatibility.data.length}.`);

const assertLocales = (rows, label) => {
  for (const row of rows) {
    const translations = row.flower_stem_translations ?? row.wrapping_option_translations ?? row.wrapping_variant_translations;
    const locales = new Set(translations.map((item) => item.locale));
    if (!locales.has("vi") || !locales.has("ko")) throw new Error(`${label} ${row.stable_code} is missing VI/KO.`);
  }
};
assertLocales(flowers.data, "Flower");
assertLocales(options.data, "Wrapping option");
assertLocales(variants.data, "Wrapping color");

for (const flower of flowers.data) {
  if (!Number.isInteger(flower.price_per_stem_amount) || flower.price_per_stem_amount < 0) throw new Error(`Invalid flower price for ${flower.stable_code}.`);
  if (!flower.media_assets || flower.media_assets.storage_bucket !== "public-media" || flower.media_assets.access !== "PUBLIC" || flower.media_assets.status !== "ACTIVE") {
    throw new Error(`Flower ${flower.stable_code} is missing public media.`);
  }
}
if (!flowers.data.some((flower) => flower.availability === "UNAVAILABLE")) throw new Error("Expected a visible unavailable flower.");
if (!variants.data.every((variant) => /^#[0-9A-Fa-f]{6}$/.test(variant.swatch_value))) throw new Error("Unsafe wrapping swatch found.");

const writeAttempt = await client.from("flower_stems").insert({
  stable_code: "anonymous-write-must-fail",
  visibility: "DRAFT",
  availability: "AVAILABLE",
  price_per_stem_amount: 1,
});
if (!writeAttempt.error) throw new Error("Anonymous Builder write unexpectedly succeeded.");

console.log("Builder runtime: PASS (8 flowers, 3 wrap types, 5 colors, 7 compatibility pairs, VI/KO, media, anon write denied)");
