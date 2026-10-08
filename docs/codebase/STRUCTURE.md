# Codebase Structure

## Top-level map

| Path | Purpose | Evidence |
|---|---|---|
| `src/` | React storefront, Admin, domain logic, repositories | `src/main.tsx` |
| `supabase/migrations/` | ordered schema, RLS, RPC changes | `supabase/config.toml` |
| `supabase/functions/` | trusted public checkout gateway | `supabase/functions/create-checkout-order/index.ts` |
| `supabase/tests/` | rollback-safe pgTAP security tests | `.github/workflows/deploy.yml` |
| `scripts/` | deterministic unit/runtime/browser QA | `package.json` |
| `docs/` | canonical product, architecture, runbook, and release docs | `AGENTS.md` |
| `graft/` | generated repository context graph | `graft/INDEX.md` |

## Entry points

- Browser entry: `src/main.tsx` → `src/App.tsx`.
- Lazy Admin entry: `src/features/admin/AdminRoutes.tsx`.
- Checkout server entry: `supabase/functions/create-checkout-order/index.ts`.
- Database entry: ordered SQL under `supabase/migrations/`.

## Module boundaries

| Boundary | Owns | Must not own |
|---|---|---|
| `src/pages`, `src/components`, `src/sections` | rendering and interaction | authoritative prices or authorization |
| `src/features/*/data` | typed public/Admin data access | presentation state |
| `src/features/*/domain.ts` | pure client domain mapping and validation | privileged database writes |
| `supabase/functions` | Turnstile/throttle gateway | browser secrets |
| `supabase/migrations` | schema, constraints, RLS, trusted commands | UI behavior |

## Naming and organization

- React components use PascalCase files; hooks use `useX`; repositories end in `Repository`.
- Features are grouped by domain (`catalog`, `cart`, `checkout`, `admin`).
- Imports are relative; no alias layer is configured.
- `src/types/database.generated.ts` is generated schema surface and should not contain handwritten business logic.

## Evidence

- `src/App.tsx`
- `src/features/catalog/data/catalogRepository.ts`
- `src/features/checkout/repository.ts`
- `supabase/functions/create-checkout-order/index.ts`
- `supabase/migrations/20261008090000_v2_commerce_foundation.sql`
