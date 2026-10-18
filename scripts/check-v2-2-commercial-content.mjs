import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [
  contentSql,
  productSql,
  guidanceFixSql,
  asciiWhitespaceSql,
  guidanceRegressionSql,
  contentRepository,
  contentTypes,
  adminContentPage,
  adminCatalogRepository,
  catalogRepository,
  productPage,
  policiesPage,
  app,
  adminRoutes,
  footer,
  viteConfig,
  packageJson,
] = await Promise.all([
  read("supabase/migrations/20261016090000_v2_2_commercial_content.sql"),
  read("supabase/migrations/20261016090100_v2_2_atomic_product_guidance.sql"),
  read("supabase/migrations/20261017090000_v2_2_preserve_omitted_product_guidance.sql"),
  read("supabase/migrations/20261018090000_v2_2_normalize_product_guidance_ascii_whitespace.sql"),
  read("supabase/tests/v2_2_legacy_product_guidance.sql"),
  read("src/features/commercialContent/repository.ts"),
  read("src/features/commercialContent/types.ts"),
  read("src/features/admin/pages/AdminCommercialPoliciesPage.tsx"),
  read("src/features/admin/data/adminCatalogRepository.ts"),
  read("src/features/catalog/data/supabaseCatalogRepository.ts"),
  read("src/pages/ProductDetailPage.tsx"),
  read("src/pages/PoliciesPage.tsx"),
  read("src/App.tsx"),
  read("src/features/admin/AdminRoutes.tsx"),
  read("src/components/Footer.tsx"),
  read("vite.config.ts"),
  read("package.json"),
]);

const fixedCodes = [
  "DELIVERY",
  "RETURNS_REFUNDS",
  "PAYMENT",
  "CONTACT_INQUIRY",
  "FLOWER_CARE_DEFAULT",
  "FRESHNESS_SUBSTITUTION_DEFAULT",
];
for (const code of fixedCodes) {
  assert.match(contentSql, new RegExp(`'${code}'`), `${code} must be schema-bounded`);
  assert.match(contentTypes, new RegExp(`"${code}"`), `${code} must be typed`);
}
assert.match(contentSql, /insert into public\.commercial_content_sections[\s\S]*'DRAFT'/);
assert.doesNotMatch(
  contentSql.split("create or replace function public.admin_save_commercial_content")[0],
  /insert into public\.commercial_content_translations/i,
  "migrations must not seed invented owner policy copy",
);
assert.match(contentSql, /create policy commercial_content_sections_public_read[\s\S]*visibility = 'PUBLISHED'/);
assert.match(contentSql, /create trigger commercial_content_sections_code_immutable[\s\S]*enforce_commercial_content_code_immutable/);
assert.match(contentSql, /COMMERCIAL_CONTENT_CODE_IMMUTABLE/);
assert.match(contentSql, /create policy commercial_content_translations_public_read[\s\S]*visibility = 'PUBLISHED'/);
assert.doesNotMatch(contentSql, /grant (insert|update|delete|all)[^;]*commercial_content[^;]*to (anon|authenticated)/i);
assert.match(contentSql, /create or replace function public\.admin_save_commercial_content[\s\S]*security definer[\s\S]*set search_path = ''/);
assert.match(contentSql, /if not public\.is_admin\(\)/);
assert.match(contentSql, /target_visibility = 'PUBLISHED'[\s\S]*normalized_title_vi = ''[\s\S]*normalized_body_ko = ''/);
assert.match(contentSql, /revoke all on function public\.admin_save_commercial_content[\s\S]*from public, anon, authenticated/);
assert.match(contentSql, /grant execute on function public\.admin_save_commercial_content[\s\S]*to authenticated/);

for (const column of ["care_instructions", "freshness_seasonality_note", "substitution_note", "fulfillment_note"]) {
  assert.match(contentSql, new RegExp(`add column ${column} text`));
  assert.match(adminCatalogRepository, new RegExp(column));
  assert.match(catalogRepository, new RegExp(column));
}
assert.match(productSql, /rename to admin_save_product_atomic_v21_internal/);
assert.match(productSql, /revoke all on function public\.admin_save_product_atomic_v21_internal\(jsonb\)[\s\S]*from public, anon, authenticated/);
assert.match(productSql, /create function public\.admin_save_product_atomic\(product_payload jsonb\)[\s\S]*security definer[\s\S]*set search_path = ''/);
assert.match(productSql, /saved_product_id := public\.admin_save_product_atomic_v21_internal\(product_payload\)[\s\S]*update public\.product_translations/);
assert.match(guidanceFixSql, /create or replace function public\.admin_save_product_atomic\(product_payload jsonb\)[\s\S]*security definer[\s\S]*set search_path = ''/);
assert.match(guidanceFixSql, /if not public\.is_admin\(\)/);
assert.match(guidanceFixSql, /saved_product_id := public\.admin_save_product_atomic_v21_internal\(product_payload\)/);
assert.doesNotMatch(guidanceFixSql, /\b(?:grant|revoke)\s+(?:all|execute)\b/i, "forward fix must retain existing RPC grants");
assert.match(asciiWhitespaceSql, /create or replace function public\.admin_save_product_atomic\(product_payload jsonb\)[\s\S]*security definer[\s\S]*set search_path = ''/);
assert.match(asciiWhitespaceSql, /if not public\.is_admin\(\)/);
assert.match(asciiWhitespaceSql, /saved_product_id := public\.admin_save_product_atomic_v21_internal\(product_payload\)/);
assert.doesNotMatch(asciiWhitespaceSql, /\b(?:grant|revoke)\s+(?:all|execute)\b/i, "ASCII whitespace fix must retain existing RPC grants");
assert.equal((asciiWhitespaceSql.match(/E' \\t\\n\\r\\f\\x0B'/g) ?? []).length, 8,
  "all eight validation/write paths must use the same explicit ASCII whitespace set");
for (const column of ["care_instructions", "freshness_seasonality_note", "substitution_note", "fulfillment_note"]) {
  assert.equal(
    asciiWhitespaceSql.split("btrim(coalesce(locale_payload->>'" + column + "', ''), E'").length - 1,
    2,
    column + " must normalize before validation and before storage",
  );
  assert.match(
    asciiWhitespaceSql,
    new RegExp(column + " = case when locale_payload \\? '" + column + "'[\\s\\S]*?else translation\\." + column + " end"),
    column + " must still preserve its own value when omitted",
  );
}
for (const column of ["care_instructions", "freshness_seasonality_note", "substitution_note", "fulfillment_note"]) {
  assert.match(
    guidanceFixSql,
    new RegExp(`${column} = case when locale_payload \\? '${column}'[\\s\\S]*?else translation\\.${column} end`),
    `${column} must preserve its own value when omitted`,
  );
}
assert.match(guidanceRegressionSql, /legacy UPDATE erased existing VI\/KO guidance/);
assert.match(guidanceRegressionSql, /V22_GUIDANCE_LATE_FAILURE/);
assert.match(guidanceRegressionSql, /ASCII whitespace did not clear all VI\/KO guidance fields/);
assert.match(guidanceRegressionSql, /maximum normalized guidance length was rejected or altered/);
assert.match(adminCatalogRepository, /\.rpc\("admin_save_product_atomic", \{ product_payload: payload \}\)/);

assert.match(contentRepository, /\.eq\("visibility", "PUBLISHED"\)/);
assert.match(contentRepository, /\.eq\("locale", locale\)/);
assert.match(contentRepository, /content: translation && translation\.title\.trim\(\)[\s\S]*: null/);
assert.match(contentRepository, /\.rpc\("admin_save_commercial_content"/);
assert.doesNotMatch(adminContentPage, /dangerouslySetInnerHTML/);
assert.doesNotMatch(policiesPage, /dangerouslySetInnerHTML/);
assert.match(adminContentPage, /window\.confirm\(copy\.publishConfirm\)/);
assert.match(adminContentPage, /!isComplete\(draft\.vi\) \|\| !isComplete\(draft\.ko\)/);

assert.match(productPage, /useCommercialContent\(locale\)/);
assert.match(productPage, /loadCheckoutOptions\(locale\)/);
assert.match(productPage, /useSiteProfile\(\)/);
assert.match(productPage, /product\.availability === "AVAILABLE" && product\.sameDayEligible && isSameDayAvailable\(checkoutOptions\)/);
assert.match(productPage, /normalizePhoneHref/);
assert.match(productPage, /isSafeEmail/);
assert.match(productPage, /isSafeInstagramUrl/);
assert.doesNotMatch(productPage, /t\.product\.detail\.seasonalNote/);
assert.doesNotMatch(productPage, /t\.product\.detail\.delivery\s*[}<]/);
assert.doesNotMatch(productPage, /type="date"|deliveryDate|cardMessage/);
assert.match(productPage, /product\.availability !== "AVAILABLE"/);
assert.match(productPage, /createReadyMadeCartItem\(product, variantId, toneId \|\| null, quantity\)/);

for (const route of ["/policies", "/ko/policies"]) {
  assert.match(app, new RegExp(route.replaceAll("/", "\\/")), `${route} must be routed`);
}
assert.match(adminRoutes, /path="commercial-policies"/);
assert.match(footer, /path\("\/policies"\)/);
for (const route of ["policies", "ko/policies", "admin/commercial-policies", "ko/admin/commercial-policies"]) {
  assert.match(viteConfig, new RegExp(`"${route}"`), `${route} must have a GitHub Pages entry point`);
}
assert.equal(JSON.parse(packageJson).scripts["check:v2-2-commercial-content"], "node scripts/check-v2-2-commercial-content.mjs");

const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
try {
  const [commercial, siteValidation, checkout] = await Promise.all([
    vite.ssrLoadModule("/src/features/commercialContent/types.ts"),
    vite.ssrLoadModule("/src/features/siteSettings/validation.ts"),
    vite.ssrLoadModule("/src/features/checkout/options.ts"),
  ]);

  const contentMap = commercial.publishedContentMap([
    { id: "delivery", code: "DELIVERY", sortOrder: 10, content: { title: "Giao nhận", summary: "Owner copy", body: "Owner body" } },
    { id: "returns", code: "RETURNS_REFUNDS", sortOrder: 20, content: null },
  ]);
  assert.equal(contentMap.get("DELIVERY").summary, "Owner copy");
  assert.equal(contentMap.get("RETURNS_REFUNDS"), null, "missing locale content must remain missing without VI fallback");

  assert.equal(siteValidation.normalizePhoneHref("+84 909 111 222"), "tel:+84909111222");
  assert.equal(siteValidation.normalizePhoneHref("javascript:alert(1)"), null);
  assert.equal(siteValidation.isSafeEmail("studio@example.com"), true);
  assert.equal(siteValidation.isSafeEmail("not-an-email"), false);
  assert.equal(siteValidation.isSafeInstagramUrl("https://www.instagram.com/lumea.studio/"), true);
  assert.equal(siteValidation.isSafeInstagramUrl("https://example.com/lumea"), false);

  const liveOptions = {
    deliveryEnabled: true,
    pickupEnabled: true,
    sameDayEnabled: true,
    sameDayCutoff: "16:00",
    deliveryHelp: null,
    pickup: null,
    zones: [{ id: "zone", code: "zone", name: "Zone", help: null, feeAmount: 0, sameDayEligible: true, areas: [{ id: "area", code: "area", name: "Area" }] }],
    windows: [{ id: "window", code: "window", label: "Window", help: null, startTime: "10:00", endTime: "12:00", sameDayEligible: true }],
    paymentMethods: { bankTransfer: true, cash: true, cashDelivery: false, cashPickup: true },
  };
  assert.equal(checkout.isSameDayAvailable(liveOptions, "15:59"), true);
  assert.equal(checkout.isSameDayAvailable(liveOptions, "16:00"), false);
  assert.equal(checkout.isSameDayAvailable({ ...liveOptions, zones: [] }, "15:00"), false);
} finally {
  await vite.close();
}

console.log("V2.2 commercial policies, localized guidance, secure contacts, live fulfillment, and V2.1 commerce compatibility contracts passed.");
