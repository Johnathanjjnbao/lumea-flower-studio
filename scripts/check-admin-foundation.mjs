import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key?.startsWith("sb_publishable_")) throw new Error("Missing browser-safe Supabase config.");

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const [occasions, tones] = await Promise.all([
  client.from("occasions").select("stable_code, occasion_translations(locale, name)"),
  client.from("tones").select("stable_code, tone_translations(locale, name)"),
]);
if (occasions.error || (occasions.data?.length ?? 0) < 6) throw new Error("Public occasion taxonomy seed is unavailable.");
if (tones.error || (tones.data?.length ?? 0) < 5) throw new Error("Public tone taxonomy seed is unavailable.");
for (const row of [...occasions.data, ...tones.data]) {
  const translations = "occasion_translations" in row ? row.occasion_translations : row.tone_translations;
  const locales = new Set(translations.map((translation) => translation.locale));
  if (!locales.has("vi") || !locales.has("ko")) throw new Error("A seeded taxonomy row is missing VI/KO.");
}

const productInsert = await client.from("products").insert({
  stable_code: "anonymous-write-must-fail",
  slug: "anonymous-write-must-fail",
  product_type: "READY_MADE_BOUQUET",
});
if (!productInsert.error) throw new Error("Anonymous Product insert was unexpectedly allowed.");

const upload = await client.storage.from("public-media").upload(
  `products/anonymous/${crypto.randomUUID()}.png`,
  new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
  { contentType: "image/png" },
);
if (!upload.error) throw new Error("Anonymous public-media upload was unexpectedly allowed.");

const profileRead = await client.from("admin_profiles").select("id").limit(1);
if (!profileRead.error) throw new Error("Anonymous admin profile read was unexpectedly allowed.");

const publicationCheck = await client.rpc("product_publication_issues", { target_product_id: crypto.randomUUID() });
if (!publicationCheck.error) throw new Error("Anonymous publication-readiness execution was unexpectedly allowed.");

console.log("Admin foundation smoke: PASS");
console.log(`Taxonomy: ${occasions.data.length} occasions, ${tones.data.length} tones, VI/KO present`);
console.log("Anonymous Product write, Storage upload, Admin profile read, and privileged RPC: denied");
