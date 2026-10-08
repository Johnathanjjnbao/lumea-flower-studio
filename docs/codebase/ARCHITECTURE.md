# Architecture

## Architectural style

- Feature-oriented React client with repository adapters and a Supabase data/security boundary.
- Postgres is the business source of truth; React owns layout and interaction only.
- Guest checkout crosses a Turnstile/throttle Edge Function before a service-role-only transactional RPC.

## System flow

```text
React route → feature hook/domain → repository → Supabase RLS or Edge Function → Postgres/Storage → mapped UI state
```

1. `src/App.tsx` selects localized public or Admin routes.
2. Feature hooks call repository modules with loading/error state.
3. Public repositories request only published/active rows under RLS.
4. Admin repositories use authenticated sessions; database policies/RPCs enforce ADMIN.
5. Checkout maps reconciled Cart identities to a token-verified Edge Function request.
6. Postgres validates identity, SKU, price, fulfillment, idempotency, and writes snapshots atomically.

## Responsibilities

| Module | Owns | Must not own | Evidence |
|---|---|---|---|
| Catalog | Product, Variant/SKU, Category, discovery reads | Order pricing | `src/features/catalog/data/` |
| Cart | versioned local item identity and reconciliation | authoritative price | `src/features/cart/` |
| Checkout | form mapping, public gateway call | service-role credentials | `src/features/checkout/` |
| Admin | operational forms and repositories | client-only authorization | `src/features/admin/` |
| Database | RLS, integrity, pricing, immutable snapshots | layout | `supabase/migrations/` |

## Reused patterns

| Pattern | Location | Purpose |
|---|---|---|
| Repository adapter | `src/features/*/data` | isolate Supabase/local data sources |
| Cache with invalidation | `storefrontCatalog.ts`, `storefrontNavigation.ts` | brief read reuse with fail-safe retry |
| Translation tables | catalog/homepage/navigation tables | VI/KO content without duplicate identities |
| Security-definer command | Admin/Checkout SQL functions | server-side authorization and atomic rules |
| Snapshot history | `orders`, `order_items`, `payments` | keep placed commerce facts stable |

## Known architectural risks

- No local Docker runtime on the current workstation means migration execution and pgTAP require CI or another authorized test environment.
- GitHub Pages is static; server trust is entirely Supabase/Edge Function based.
- Some V1 local data remains as development/error fallback and must never become the production commerce source.

## Evidence

- `docs/LUMEA_ARCHITECTURE.md`
- `src/features/checkout/repository.ts`
- `supabase/functions/create-checkout-order/gateway.ts`
- `supabase/migrations/20261008090200_v2_commerce_checkout.sql`
