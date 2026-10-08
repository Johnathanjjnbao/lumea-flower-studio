# V2.1 Commerce Foundation — Context Map

Status: reviewed before significant implementation on branch `v2-commercial-readiness`.

## Product Review Gate

1. **Why does this work exist?** To close the commerce identity and discovery gaps left after V1: stable SKU, first-class Category management, explicit Product-to-Category ownership, and data-driven storefront navigation.
2. **Who uses it?** Customers browsing and checking out; ADMIN operators managing Products, Categories, and Navigation; and the trusted Checkout server resolving authoritative commerce identities.
3. **What is the primary action?** ADMIN maintains valid commerce data; customers reach the correct Product and submit the correct SKU; Checkout validates that SKU and snapshots it on the Order.
4. **Does the structure support that action?** Yes. The design keeps authoritative identity in Postgres, exposes only active public rows under RLS, uses focused Admin sections, and preserves the existing server-authoritative Checkout boundary.

## Existing model findings

1. Product identity is `products.id` plus immutable-style `stable_code`; public URLs use `slug`.
2. Orderable ready-made variants already exist in `product_variants` with Product-scoped `stable_code`, explicit authoritative VND price, active state, translations, and order.
3. Ready-made Cart identity currently combines Product UUID, Variant UUID, and optional Tone stable code. It stores Product/Variant IDs and stable codes plus a client display/price snapshot.
4. Checkout accepts Product/Variant IDs and stable codes, then the revoked internal security-definer function resolves Product, Variant, Tone, availability, and authoritative price in Postgres.
5. `order_items` currently snapshots Product code/slug/name, Variant code/name, Tone, media path, unit price, quantity, and line total. It does not snapshot SKU.
6. Occasion is already database-driven and M:N through `product_occasions`. It is shopping taxonomy, not the canonical primary Category described in `docs/LUMEA_DATA_MODEL.md`.
7. Category is documented as Product N:1 in the canonical model but is missing from the V1 schema and UI.
8. Desktop Header navigation and mobile/quick homepage navigation are currently sourced from `siteConfig` plus static VI/KO dictionaries. They are not Admin-managed.
9. Product availability is separate from publication visibility; inactive variants are excluded from public reads and Checkout.

## Context Map

### Files to modify

| File | Purpose | Changes needed |
|---|---|---|
| `supabase/migrations/20261008090000_v2_commerce_foundation.sql` | Commerce schema | Add SKU, Category, Product relation, Navigation, seed/backfill, indexes, RLS and grants. |
| `supabase/migrations/20261008090100_v2_commerce_admin.sql` | Safe Admin mutations | Add ADMIN-only atomic Category and Navigation RPCs. |
| `supabase/migrations/20261008090200_v2_commerce_checkout.sql` | Checkout compatibility | Validate SKU server-side, preserve existing Checkout logic, and snapshot SKU on new Orders. |
| `supabase/migrations/20261008090300_v2_commerce_atomic_product.sql` | Product mutation integrity | Commit Product, canonical Category, VI/KO copy, Variants/SKUs, Occasions, and Tones atomically through an ADMIN-only RPC. |
| `src/types/database.generated.ts` | Typed database contract | Regenerate/update for new schema and RPCs. |
| `src/features/admin/types.ts` | Admin Product model | Add Category assignment and variant SKU. |
| `src/features/admin/data/adminCatalogRepository.ts` | Product persistence | Read/write Category ID and SKU. |
| `src/features/admin/productValidation.ts` | Admin validation | Require valid Category and globally formatted SKU before publish/save. |
| `src/features/admin/components/ProductDetailsForm.tsx` | Product editor | Add Category selector and SKU fields without creating a giant new form. |
| `src/features/admin/categories/*` | Category Admin | Focused list/editor repository, validation, dependency state, activation, and reorder. |
| `src/features/admin/navigation/*` | Navigation Admin | Focused CRUD/reorder UI with safe typed destinations. |
| `src/features/admin/AdminRoutes.tsx` | Admin routing | Add Categories and Navigation routes. |
| `src/features/admin/components/AdminShell.tsx` | Admin navigation | Expose the two new sections. |
| `src/features/catalog/data/*` | Public catalog | Load Category and SKU with published Products; filter by Category. |
| `src/features/catalog/useCatalogData.ts` | Public data hooks | Load managed Categories. |
| `src/pages/CatalogPage.tsx` | Catalog discovery | Add database-driven Category filter while preserving Occasion URLs. |
| `src/features/navigation/*` | Public navigation | Load active Navigation rows and map safe destination types to routes. |
| `src/components/Header.tsx` | Storefront menu | Render managed VI/KO labels/order with a safe fallback. |
| `src/features/cart/*` | Persisted Cart | Carry SKU and migrate/reconcile V1 local Cart records. |
| `src/features/checkout/*` | Checkout payload | Send SKU while continuing to omit trusted prices. |
| `src/features/admin/orders/*` | Order operations | Surface SKU snapshots without changing historical Orders. |
| `src/i18n/vi.ts`, `src/i18n/ko.ts` | UI copy | Add complete VI/KO customer and Admin copy. |
| `styles.css` | Responsive UI | Keep new Admin/customer controls usable at 390, 768, and 1440 widths. |
| `scripts/check-v2-commerce.mjs` | Deterministic QA | Cover schema, SKU, Category, Navigation, RLS, Checkout, and compatibility contracts. |
| `scripts/check-ci.mjs`, `package.json` | CI gate | Include the new V2.1 deterministic checks. |
| `docs/V2_1_COMMERCE_FOUNDATION.md` | V2 documentation | Document the final model, migration behavior, Admin use, and limits. |

### Dependencies

| File | Relationship |
|---|---|
| `src/features/catalog/data/catalogRepository.ts` | Shared Product/Variant/Category/SKU contracts consumed by Product, Cart, and Catalog pages. |
| `src/features/cart/domain.ts` | Creates Cart identity from catalog records. |
| `src/features/cart/reconciliation.ts` | Upgrades persisted V1 Cart lines with authoritative SKU and current state. |
| `src/features/checkout/domain.ts` | Maps reconciled Cart lines to the gateway payload. |
| `supabase/functions/create-checkout-order/*` | Keeps the Turnstile/throttle gateway unchanged while forwarding the extended payload. |
| `src/config/siteConfig.ts` | Remains the safe fallback and route-definition reference, not the business source of truth. |

### Tests

| Test | Coverage |
|---|---|
| `scripts/check-v2-commerce.mjs` | New V2.1 schema and source contracts, migration/backfill, RLS/grants, SKU and safe destinations. |
| `scripts/check-cart.mjs` | SKU identity, persisted V1 Cart migration, reconciliation and disabled variants. |
| `scripts/check-checkout.mjs` | SKU payload mapping and price-exclusion invariant. |
| `scripts/check-storefront-runtime.mjs` | Live published Category/SKU relationships when a linked test environment is available. |
| Browser QA scripts | Customer navigation/catalog/product/cart/checkout and Admin Category/Navigation/Product editing. |

### Reference patterns

| File | Pattern to reuse |
|---|---|
| `src/features/admin/discovery/repository.ts` | Small bilingual Admin-managed taxonomy repository. |
| `src/features/admin/pages/AdminDiscoveryPage.tsx` | Responsive list/edit status UI. |
| `supabase/migrations/20261005160000_atomic_operations_settings.sql` | ADMIN-only atomic security-definer mutations with narrow grants. |
| `src/features/catalog/data/storefrontCatalog.ts` | Cached public data with explicit invalidation. |
| `src/features/cart/reconciliation.ts` | Backward-compatible client snapshot reconciliation. |

### Risk assessment

- [x] Public data/API contracts change.
- [x] Database migrations are required.
- [ ] New environment variables or external services are required.
- [x] Existing persisted Carts require compatibility handling.
- [x] Checkout and Order integrity require server-side regression testing.
- [x] RLS and execute grants require explicit review.

## Architecture decisions

- Category follows the canonical N:1 Product relationship because it classifies product type, while Occasion remains a separate M:N discovery taxonomy, featured/bestseller remain flags, and Navigation only links to a Category. A future curated Collection should be a separate M:N merchandising aggregate if that use case becomes real.
- Existing `product_variants` are sufficient; V2.1 adds a globally unique SKU rather than introducing a second variant system.
- SKU is stored independently from display names and stable codes. Admin may set it, Postgres enforces uniqueness/format, Checkout validates it, and Orders snapshot it.
- Existing products are assigned to a seeded published `bouquets` Category so migration never empties the storefront.
- Navigation uses a bounded destination enum and optional Category reference. Internal paths are derived in application code; Admin cannot enter arbitrary internal route strings.
- Existing V1 Checkout remains the pricing authority. A new narrow wrapper validates SKU and records the snapshot without weakening Turnstile, throttling, idempotency, or RPC grants. Historical V1 Order items remain `NULL` for SKU because no SKU was captured at purchase time; only new V2 ready-made Order items are required to hold the snapshot.
- The Product editor no longer performs a partially durable sequence of browser writes. One ADMIN-only `SECURITY DEFINER` RPC validates and commits Product, Category, translations, Variants/SKUs, Occasions, and Tones in one transaction; any failure rolls the mutation back.
