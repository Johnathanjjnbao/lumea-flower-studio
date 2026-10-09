# Luméa V2.1 — Commerce Foundation

**Status:** Production promotion is in progress from `v2-commercial-readiness`; no production PASS is claimed until every deployment and production acceptance gate completes.

## Purpose

V2.1 closes the commerce identity and discovery gaps identified after V1: stable SKU, first-class Categories, explicit Product membership, and database-managed primary Navigation. It does not redesign the site or declare the business commercially ready.

## Identity and relationships

- `products.id` is the internal Product identity; `stable_code` and `slug` remain stable public/business references.
- `product_variants.id` identifies the option row. `product_variants.sku` is the globally unique, human-readable orderable identity and is immutable after creation.
- Product has one required `category_id`. Category is the canonical product classification (for example bouquets, arrangements, or gifts), so Product-to-Category remains N:1. Occasion remains M:N through `product_occasions`; featured/bestseller are merchandising flags; Navigation points to a canonical Category rather than creating membership. If the business later needs curated Collections, they should be introduced as a separate M:N merchandising model instead of changing canonical Category semantics.
- Builder configurations keep their existing structured flower/wrapping identity and are not forced into the ready-made SKU model.

## Admin operation

- Products: select Category; enter a unique SKU for every variant; existing SKU fields are read-only. Product metadata, the Category relation, VI/KO copy, Variants/SKUs, Occasions, and Tones are saved by one ADMIN-only database transaction. A failed child write rolls back the whole Product save.
- Categories: create/edit VI and KO, activate/deactivate, reorder, and archive only when no Product depends on the Category.
- Navigation: manage VI/KO labels, active state, order, typed internal destinations, real Category targets, or validated HTTPS external destinations.

## Storefront behavior

Header menu labels, order, state, and targets are loaded from Postgres. Current V1 navigation is seeded so the menu is not empty after migration. Catalog Category filters and Product membership are database-driven. During load or a data error, the existing code-owned V1 menu is the safe continuity fallback.

## Checkout and Order behavior

- Cart persists SKU for new ready-made lines. V1 carts without SKU remain readable and acquire the current authoritative SKU during reconciliation.
- Checkout sends Product ID/code, Variant ID/code, and SKU. The service-role-only RPC verifies all identities, active status, Product availability/publication, and Category publication before delegating to the existing authoritative pricing implementation.
- Browser prices remain untrusted. Builder, seasonal availability, delivery pricing, Turnstile, throttle, and direct-RPC revocation remain unchanged.
- Historical V1 `order_items.sku_snapshot` values intentionally remain `NULL`: V1 did not capture an SKU at purchase time, so current Variant data must not be rewritten as historical truth. Admin Order Detail renders these legacy values as `SKU: —`.
- Every newly inserted V2 ready-made Order item must have an SKU snapshot before transaction commit. A deferred database constraint supports the existing transactional Checkout implementation while rejecting incomplete new rows.
- V2 requests receive a full request fingerprint including SKU, so idempotent retries remain durable without allowing the same key to represent a different SKU.

## Migration sequence

1. `20261008090000_v2_commerce_foundation.sql`: SKU, Category, Product relation, managed Navigation, seed/backfill, RLS.
2. `20261008090100_v2_commerce_admin.sql`: ADMIN-only Category and Navigation commands.
3. `20261008090200_v2_commerce_checkout.sql`: Order SKU snapshots and the SKU-aware checkout wrapper.
4. `20261008090300_v2_commerce_atomic_product.sql`: ADMIN-only transactional Product/Category/Variant/SKU/taxonomy save.
5. `20261008090400_v2_commerce_atomic_product_lint.sql`: explicit enum typing required by PostgreSQL lint while preserving the atomic Product command.
6. `20261008090500_v2_commerce_checkout_legacy_guard.sql`: prevents a post-V2 idempotent retry from fabricating an SKU snapshot on a legacy V1 Order.

The migrations preserve V1 tables and Orders, do not modify the `v1.0.0` tag, and seed all current Products into the `bouquets` Category.

## Security posture

- Public roles receive SELECT only on active/published Category and Navigation records.
- ADMIN authorization is repeated server-side in every mutation RPC; STAFF receives no new permission.
- Product save uses `SECURITY DEFINER` only behind an ADMIN check, a fixed empty `search_path`, bounded payload validation, and narrow execute grants. The browser never receives `service_role`.
- Stable SKU/Category/Navigation identifiers are enforced by database triggers.
- Category hard-delete is protected by `ON DELETE RESTRICT`; archive RPC refuses Categories still in use.
- Checkout RPC execution remains revoked from `public`, `anon`, and `authenticated`; only `service_role` can execute it through the existing Edge Function.
- External Navigation URLs require HTTPS in both database validation and the frontend mapper.

## Verification commands

```bash
npm run check:ci
npm run check:v2-commerce-browser
npm run check:supabase-foundation
npm run check:admin-foundation
npm run build
npm audit --audit-level=low
npm run check:secrets
npm run check:secrets-history
supabase test db
```

Database runtime and browser verification must be run only after the canonical V2.1 migrations and the updated Edge Function are deployed to an authorized non-production environment.

The chain through `20261008090400` passed acceptance on the dedicated non-production project `puzuubnxarmviwgpjclj` on 2026-10-08. Final production review then found the legacy idempotent-retry history gap and added `20261008090500` plus a rollback-safe regression. The complete canonical chain must pass GitHub's local Supabase/pgTAP gate before production promotion. The reusable staging gates are `npm run check:v2-staging-runtime` and `npm run check:v2-staging-browser`; both require an explicitly supplied staging environment and the browser gate requires a temporary staging-only ADMIN identity. Staging remains separate and is not a production target.
