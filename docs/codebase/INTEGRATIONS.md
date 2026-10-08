# External Integrations

## Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|---|---|---|---|---|---|
| Supabase Postgres | database/API | catalog, Admin, Orders, settings | publishable key + RLS; service role only in Edge Function | high | `src/lib/supabase.ts`, migrations |
| Supabase Auth | identity | ADMIN session/recovery | Supabase JWT + `admin_profiles` | high | `src/features/admin/auth/` |
| Supabase Storage | object storage | public/private media | bucket RLS | high | `supabase/migrations/20260927090200_storage_foundation.sql` |
| Supabase Edge Functions | API | checkout trust gateway | Turnstile + throttle + service role | high | `supabase/functions/create-checkout-order/` |
| Cloudflare Turnstile | verification API | checkout bot resistance | public site key + server secret | high | `gateway.ts`, `.env.example` |
| GitHub Pages/Actions | CI/hosting | quality gates and static deployment | GitHub environment/OIDC | high | `.github/workflows/deploy.yml` |
| Google Maps | external link/embed | Visit directions | validated public HTTPS/query | medium | `src/features/homepage/visit.ts` |
| VietQR | image endpoint | per-Order payment QR | public bounded URL fields | medium | `src/features/checkout/receipt.ts` |

## Secrets and reliability

- Browser receives only `VITE_*` public values. Turnstile secret, throttle HMAC key, and service role stay in Edge Function secrets.
- Checkout uses request timeout, bounded public errors, idempotency, and database locking; storefront data hooks expose loading/error fallbacks.
- There is no general circuit breaker or application metrics stack. TODO: define production alert ownership before real commercial operation.

## Evidence

- `.env.example`
- `supabase/.env.example`
- `supabase/functions/create-checkout-order/index.ts`
- `.github/workflows/deploy.yml`
- `scripts/check-secrets.mjs`
