import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [foundationSql, adminSql, checkoutSql, atomicProductSql, adminCatalogRepository, adminOrderDetail, viteConfig] = await Promise.all([
  read("supabase/migrations/20261008090000_v2_commerce_foundation.sql"),
  read("supabase/migrations/20261008090100_v2_commerce_admin.sql"),
  read("supabase/migrations/20261008090200_v2_commerce_checkout.sql"),
  read("supabase/migrations/20261008090300_v2_commerce_atomic_product.sql"),
  read("src/features/admin/data/adminCatalogRepository.ts"),
  read("src/features/admin/pages/AdminOrderDetailPage.tsx"),
  read("vite.config.ts"),
]);

assert.match(foundationSql, /alter table public\.product_variants[\s\S]*alter column sku set not null[\s\S]*product_variants_sku_unique unique \(sku\)/);
assert.match(foundationSql, /PRODUCT_VARIANT_SKU_IMMUTABLE/);
assert.match(foundationSql, /update public\.product_variants variant[\s\S]*product\.stable_code[\s\S]*variant\.stable_code/);
assert.match(foundationSql, /create table public\.categories/);
assert.match(foundationSql, /products_category_id_fkey[\s\S]*on delete restrict/);
assert.match(foundationSql, /categories_stable_code_immutable/);
assert.match(foundationSql, /insert into public\.categories[\s\S]*'bouquets'/);
assert.match(foundationSql, /create table public\.navigation_items/);
assert.match(foundationSql, /navigation_items_stable_code_immutable/);
assert.match(foundationSql, /navigation_destination_type/);
assert.match(foundationSql, /external_url ~ '\^https:\/\//);
assert.match(foundationSql, /create policy categories_public_read[\s\S]*visibility = 'PUBLISHED'/);
assert.match(foundationSql, /create policy navigation_items_public_read[\s\S]*active/);
assert.doesNotMatch(foundationSql, /grant (insert|update|delete|all)[^;]*to anon/i);

for (const functionName of [
  "admin_save_category",
  "admin_archive_category",
  "admin_reorder_categories",
  "admin_save_navigation_item",
  "admin_delete_navigation_item",
  "admin_reorder_navigation",
]) {
  assert.match(adminSql, new RegExp(`create or replace function public\\.${functionName}`));
}
assert.equal((adminSql.match(/if not public\.is_admin\(\)/g) ?? []).length, 6, "every V2 Admin RPC must enforce ADMIN server-side");
assert.match(adminSql, /ADMIN_CATEGORY_IN_USE/);
assert.match(adminSql, /target_active or category\.visibility = 'PUBLISHED'/);
assert.doesNotMatch(adminSql, /grant execute[^;]*to anon/i);

assert.match(checkoutSql, /alter table public\.order_items[\s\S]*add column sku_snapshot text/);
assert.equal((checkoutSql.match(/set sku_snapshot = variant\.sku/g) ?? []).length, 1, "historical Order rows must not be backfilled from current Variant data");
assert.match(checkoutSql, /Historical V1 rows intentionally remain NULL/);
assert.match(checkoutSql, /create constraint trigger order_items_new_sku_snapshot_required[\s\S]*after insert or update[\s\S]*deferrable initially deferred/);
assert.match(checkoutSql, /ORDER_ITEM_SKU_SNAPSHOT_REQUIRED/);
assert.match(checkoutSql, /add column commerce_request_fingerprint text/);
assert.match(checkoutSql, /variant\.sku = cart_item->>'sku'/);
assert.match(checkoutSql, /variant\.active/);
assert.match(checkoutSql, /product\.availability = 'AVAILABLE'/);
assert.match(checkoutSql, /category\.visibility = 'PUBLISHED'/);
assert.match(checkoutSql, /set sku_snapshot = variant\.sku/);
assert.match(checkoutSql, /existing_contract_fingerprint <> full_contract_fingerprint/);
assert.match(checkoutSql, /revoke all on function public\.create_checkout_order\(jsonb, uuid, bigint\)[\s\S]*from public, anon, authenticated/);
assert.match(checkoutSql, /grant execute on function public\.create_checkout_order\(jsonb, uuid, bigint\)[\s\S]*to service_role/);
assert(checkoutSql.indexOf("select exists (") < checkoutSql.indexOf("select variant.id into resolved_variant_id"), "idempotent retries must be resolved before current catalog availability");

assert.match(atomicProductSql, /create or replace function public\.admin_save_product_atomic\(product_payload jsonb\)/);
assert.match(atomicProductSql, /security definer[\s\S]*set search_path = ''/);
assert.match(atomicProductSql, /if not public\.is_admin\(\)/);
assert.match(atomicProductSql, /jsonb_array_length\(product_payload->'variants'\) > 100/);
assert.match(atomicProductSql, /for share/);
assert.match(atomicProductSql, /insert into public\.products[\s\S]*insert into public\.product_translations[\s\S]*insert into public\.product_variants[\s\S]*insert into public\.product_variant_translations/);
assert.match(atomicProductSql, /delete from public\.product_occasions[\s\S]*insert into public\.product_occasions[\s\S]*delete from public\.product_tones[\s\S]*insert into public\.product_tones/);
assert.match(atomicProductSql, /revoke all on function public\.admin_save_product_atomic\(jsonb\) from public, anon/);
assert.match(atomicProductSql, /grant execute on function public\.admin_save_product_atomic\(jsonb\) to authenticated/);
assert.match(adminCatalogRepository, /\.rpc\("admin_save_product_atomic", \{ product_payload: payload \}\)/);
assert.doesNotMatch(adminCatalogRepository, /async saveProduct[\s\S]*this\.client\.from\("products"\)\.insert/);
assert.match(adminOrderDetail, /item\.sku_snapshot \?\? "—"/, "legacy Orders without captured SKU must render safely");
for (const route of ["admin/categories", "admin/navigation", "ko/admin/categories", "ko/admin/navigation"]) {
  assert.match(viteConfig, new RegExp(`"${route}"`), `${route} must have a GitHub Pages entry point`);
}

const vite = await createServer({ appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
try {
  const [navigation, discovery, checkout, gateway] = await Promise.all([
    vite.ssrLoadModule("/src/features/navigation/types.ts"),
    vite.ssrLoadModule("/src/utils/catalogDiscovery.ts"),
    vite.ssrLoadModule("/src/features/checkout/domain.ts"),
    vite.ssrLoadModule("/supabase/functions/create-checkout-order/gateway.ts"),
  ]);

  assert.equal(navigation.navigationDestinationPath("CATALOG", null, null), "/flowers");
  assert.equal(navigation.navigationDestinationPath("CATEGORY", "hoa-cuoi", null), "/flowers?category=hoa-cuoi");
  assert.equal(navigation.navigationDestinationPath("CATEGORY", "hoa & qua", null), "/flowers?category=hoa%20%26%20qua");
  assert.equal(navigation.navigationDestinationPath("EXTERNAL", null, "https://maps.example.test/studio"), "https://maps.example.test/studio");
  assert.equal(navigation.navigationDestinationPath("EXTERNAL", null, "javascript:alert(1)"), null);
  assert.equal(navigation.navigationDestinationPath("EXTERNAL", null, "http://example.test"), null);

  const product = {
    id: "product-1", stableCode: "pink-garden", slug: "pink-garden", productType: "READY_MADE_BOUQUET",
    category: { id: "category-1", stableCode: "bouquets", slug: "hoa-bo", name: "Hoa bó", description: null, sortOrder: 10 },
    availability: "AVAILABLE", sameDayEligible: true, featured: false, bestseller: false, sortOrder: 10,
    name: "Pink Garden", shortDescription: null, description: null, composition: [], seoTitle: null, seoDescription: null,
    startingPriceAmount: 550_000,
    variants: [{ id: "variant-1", stableCode: "standard", sku: "LUM-PINK-GARDEN-STANDARD", name: "Standard", description: null, priceAmount: 550_000, sortOrder: 10 }],
    images: [], occasionCodes: [], occasions: [], tones: [],
  };
  const filtered = discovery.filterCatalogProducts([product], { query: "hoa bo", category: "hoa-bo", occasion: null, budget: null, sameDay: false, availability: null }, "vi", []);
  assert.equal(filtered.length, 1, "catalog membership and localized Category search must be database-record driven");
  assert.equal(discovery.filterCatalogProducts([product], { query: "", category: "other", occasion: null, budget: null, sameDay: false, availability: null }, "vi", []).length, 0);

  const readyLine = {
    id: "ready:product-1:variant-1:none", type: "READY_MADE_PRODUCT", quantity: 1, unitPriceSnapshot: 550_000,
    addedAt: "2026-10-08T00:00:00.000Z", productId: "11111111-1111-4111-8111-111111111111", productCode: "pink-garden",
    productSlug: "pink-garden", variantId: "22222222-2222-4222-8222-222222222222", variantCode: "standard",
    sku: "LUM-PINK-GARDEN-STANDARD", toneCode: null,
    display: { productName: "Pink Garden", variantName: "Standard", toneName: null, imageUrl: null, imageAlt: "Pink Garden" },
    validation: { state: "valid" },
  };
  const form = {
    buyerName: "Nguyễn An", buyerPhone: "0909111222", buyerEmail: "", buyerIsRecipient: true,
    recipientName: "", recipientPhone: "", isSurprise: false, fulfillmentType: "PICKUP", deliveryAreaId: "",
    deliveryWindowId: "", deliveryAddress: "", deliveryDate: "2026-10-09", deliveryNotes: "", cardMessage: "", paymentMethod: "CASH",
  };
  const payload = checkout.createCheckoutPayload(form, [readyLine], "vi", 0);
  assert.equal(payload.items[0].sku, "LUM-PINK-GARDEN-STANDARD");
  assert.throws(() => checkout.createCheckoutPayload(form, [{ ...readyLine, sku: null }], "vi", 0), /CHECKOUT_SKU_MISSING/);
  assert.equal(gateway.classifyOrderError("CHECKOUT_SKU_UNAVAILABLE"), "ITEM_UNAVAILABLE");
} finally {
  await vite.close();
}

console.log("V2.1 SKU history, canonical Category, atomic Product, Navigation, RLS/RPC, storefront, checkout, and compatibility contracts passed.");
