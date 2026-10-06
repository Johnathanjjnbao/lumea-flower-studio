# Luméa Supabase Setup

This guide is the operational reference for the Supabase foundation through Step 15. Product/Media operations are documented in `docs/ADMIN_PRODUCT_MEDIA.md`; Builder data operations are documented in `docs/BUILDER_DATA_ADMIN.md`. Step 12 adds guest Checkout and secure Order creation, Step 13 adds protected Admin Order operations, Step 14 adds delivery/payment/VietQR, and Step 15 adds canonical business settings plus the Turnstile-protected Checkout gateway.

## Project identity

- Project name: `lumea-flower-studio`
- Project reference: `nihhynwvltttadlfatdm`
- Region: Southeast Asia (Singapore), `ap-southeast-1`
- Browser URL: derived from the verified project reference and stored only in local/deployment environment configuration

Always verify the linked project before applying a migration:

```powershell
npx supabase projects list --output json
npx supabase migration list
```

The Luméa row must show `linked: true`. Never apply these migrations to `hlimebakery-project` or another project.

## Environment setup

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

Only browser-safe values may use the `VITE_` prefix. `VITE_TURNSTILE_SITE_KEY` is a public widget key; the tracked value is Cloudflare's official always-pass test site key for local/test builds. Production must replace it through the GitHub Repository Variable of the same name. Do not add a Turnstile secret, Supabase secret key, legacy `service_role` key, database password, or CLI access token to frontend environment files.

`.env.local`, `.env`, and `.env.*` are ignored by Git. `.env.example` is intentionally tracked and contains only empty placeholders plus Cloudflare's public test site key.

The live storefront, Builder, and Checkout require both public values and fail with localized retry states when Supabase access is unavailable; none silently falls back to local production data. Supplying only one value, an invalid URL, or a non-publishable key produces a clear configuration error when the Supabase client is requested.

## CLI and migration workflow

Authenticate locally without sharing the access token:

```powershell
npx supabase login
```

Initialize once and link only to the verified project:

```powershell
npx supabase init
npx supabase link --project-ref nihhynwvltttadlfatdm
```

Create and review a migration before applying it:

```powershell
npx supabase migration new descriptive_name
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
npx supabase db lint --linked --level warning
```

Do not edit a migration after it has been applied remotely. Add a forward migration instead.

Generate database types after schema changes:

```powershell
npx supabase gen types typescript --linked --schema public > src/types/database.generated.ts
```

Commit the generated type update with its migration. Never hand-edit generated database types.

## Implemented schema boundary

The implemented foundation includes Product, Media, Bouquet Builder, and guest Order data:

- Product identity, type, visibility, availability, merchandising flags, same-day eligibility, ordering, and archive timestamps.
- VI/KO Product translations with unique `(product_id, locale)` identity.
- Explicit integer-VND Product variants and VI/KO variant translations.
- Stable media records, localized alt text/captions, and ordered Product image placements.
- Occasion and tone taxonomy with localized labels and Product relations.
- Supabase Auth-linked `ADMIN` and `STAFF` application profiles.
- Flower stems with availability, integer-VND per-stem pricing, VI/KO content, sort order, media, and lifecycle state.
- Wrapping options and colour variants with VI/KO content, integer-VND modifiers, safe swatches, and explicit compatibility relations.
- Orders, immutable Order-item snapshots, recipient/address/delivery records, Payment metadata, and initial Order status events.
- A single `create_checkout_order(jsonb, uuid, bigint)` transaction boundary for guest Checkout.
- A bounded `admin_list_orders(...)` query and `admin_transition_order_status(...)` command for active ADMIN profiles.
- Canonical Site Profile, budget discovery ranges, delivery zones/areas/windows, and payment settings used by both Admin and Storefront.
- A private HMAC-keyed Checkout throttle and the public `create-checkout-order` Edge Function gateway.

Product price is derived from active variants; there is no duplicate mutable Product base-price column. Visibility and availability remain separate. A `PUBLISHED + UNAVAILABLE` Product may be visible while not purchasable.

Publishing a Product requires Vietnamese copy, at least one active priced variant for Product-backed bouquet types, and one active public primary image. The database permits only one active primary image per Product.

Cart and Builder draft persistence remain browser-local and store stable identities rather than trusted prices. Checkout sends only those identities, quantities, and customer-entered request fields. The database function reloads current Product/Builder records, validates publication/availability/compatibility, computes integer-VND item totals, applies the current delivery/payment rules, and creates the complete Order aggregate atomically. Order items, delivery fee, final total, fulfillment data, and applicable payment settings are stored as historical snapshots.

All Order tables have RLS enabled. `anon` has no direct Order-table access, and `public`, `anon`, and `authenticated` cannot execute the internal `create_checkout_order` function. Only the Edge Function's server-side service role may reach that function. The isolated public storefront client does not reuse an Admin session. Authenticated reads pass RLS only for an active `ADMIN`, and the `orders` column grant excludes checkout idempotency/request hashes. No browser role receives direct Order mutation rights.

`admin_list_orders(...)` validates active ADMIN membership, caps each page at 50 rows, and searches only the documented order/buyer/recipient fields. `admin_transition_order_status(...)` accepts only typed status values, locks the authoritative Order row, compares `expected_status`, enforces the V1 transition matrix, updates the Order, and creates one actor-linked status event in the same transaction. Both functions use an empty `search_path`; neither is executable by `anon`. Payment and Delivery mutation remain out of scope for Step 13.

The internal Checkout function uses an empty `search_path`, exact JSON-field allowlists, bounded quantities and text, fixed server-side initial statuses, a hashed idempotency key, and transaction-scoped serialization for concurrent retries. Its result is a minimal receipt; there is no anonymous Order lookup, update, or delete endpoint. The Edge Function verifies Turnstile `success`, exact hostname, and action before applying the server-side throttle and calling this unchanged money boundary.

## Auth and roles

Supabase Auth owns identity. `public.admin_profiles` maps an Auth user to the application role.

- Active `ADMIN` profiles can manage Product/Media and Builder data, read Order operations data, and perform approved Order-status transitions. `STAFF` remains blocked until the owner approves exact permissions.
- Only an active `ADMIN` profile can manage Admin profile rows.
- Public or ordinary authenticated users cannot create a profile or promote themselves.
- UI route guards are not authorization; RLS remains authoritative.

No Auth user or fake Admin is created by migration. Before Step 9B runtime testing, the owner must create the first Auth user through Supabase Auth. A trusted database owner then adds the initial `ADMIN` profile. Do not insert directly into `auth.users` and do not bootstrap the first role from the public client.

Detailed STAFF permissions remain an owner decision. The Step 9B forward migration narrows catalog/media mutation to ADMIN-only; staff and Admin-profile management also remain ADMIN-only.

### Admin password recovery

Admin recovery uses the official Supabase Auth email flow. From `/admin/login` or `/ko/admin/login`, choose the forgot-password link, submit the Admin email, open the link from Supabase, and set a new password on the localized reset route. The request response is deliberately identical for known and unknown emails. Recovery tokens are consumed by the Supabase client, are never logged or copied into locale-switch links, and the client signs out globally after a successful password update before returning to Admin login.

New and reset passwords require at least 15 characters in both the UI and Supabase Auth. Existing passwords are not rewritten by this policy change. Password-manager paste remains supported; no arbitrary composition rule is imposed.

Production Auth URL configuration for project `nihhynwvltttadlfatdm` must remain:

- Site URL: `https://johnathanjjnbao.github.io/lumea-flower-studio/`
- Production redirects: `/lumea-flower-studio/admin/reset-password` and `/lumea-flower-studio/ko/admin/reset-password` on `https://johnathanjjnbao.github.io`
- Local development redirects: the same two paths on `http://localhost:5173` and `http://127.0.0.1:5173`

Do not add wildcard redirect hosts, user-controlled redirect parameters, a service-role key, or a password-reset shortcut. An opened recovery link still requires an active `ADMIN` profile before the reset form is shown. A real production recovery verification cannot be completed by automation alone: the owner must open the email in their own mailbox, choose a new password, confirm the new login, then sign out and verify the Admin guard.

## Storage strategy

The migrations create two buckets:

| Bucket | Access | Intended content |
|---|---|---|
| `public-media` | Public read; active Admin/Staff write | Product, taxonomy, homepage, gallery, flower, and wrapping images |
| `private-uploads` | Active Admin/Staff only | Future custom-request reference images |

Allowed object MIME types are JPEG, PNG, WebP, and AVIF. SVG is intentionally excluded. A final byte/dimension limit remains an owner decision and must be enforced by the trusted Step 9B upload flow before production uploads are accepted.

Use generated immutable object names. Recommended paths are:

- `products/{productId}/{assetId}.{ext}`
- `occasions/{occasionId}/{assetId}.{ext}`
- `homepage/{sectionKey}/{assetId}.{ext}`
- `gallery/{assetId}.{ext}`
- `builder/flowers/{flowerId}/{assetId}.{ext}`
- `builder/wrapping/{wrappingId}/{assetId}.{ext}` when wrapping photography is introduced
- `custom-requests/{requestId}/{assetId}.{ext}` in `private-uploads`

The original filename is metadata only and must never be the object identity. Public users cannot upload, update, or delete Storage objects. Private bucket objects are never public-read.

For `public-media`, public read means fetching an object from an exact known public URL. Anonymous bucket/object listing is disabled; public paths come from RLS-filtered `media_assets` records attached to published content.

## RLS posture

RLS is enabled on every Step 9A business table.

- Anonymous/public reads expose only published, non-archived Products, taxonomy, flowers, wrapping options, colours, and active compatibility rows.
- Product translations, active variants, relationships, and image placements are readable only through a public Product.
- Public media metadata is readable only when active and attached to published content.
- Anonymous insert, update, and delete are denied.
- Active catalog managers may write through authenticated sessions.
- Role helpers are `SECURITY DEFINER` functions with an empty `search_path` and execution limited to `authenticated`.
- Trigger and publication-readiness helpers are not executable by public roles.

The first Admin write runtime test is deferred until an owner-approved Auth user exists. Schema, grants, policies, remote lint, anonymous read, anonymous write denial, and private-upload isolation are verified in Step 9A.

## Repository boundary

React components must not query Supabase directly.

- `CatalogRepository` defines published list and slug-detail reads.
- `SupabaseCatalogRepository` is the active storefront source for Catalog, Product Detail, and homepage featured Products.
- `LocalCatalogRepository` and `src/data/content.ts` are retained only as a controlled development/import fixture; no production storefront path imports them.
- `src/lib/supabase.ts` owns two lazy browser clients: the persisted Admin client and a non-persisted public client that cannot inherit an Admin session.
- `src/features/catalog/data/storefrontCatalog.ts` owns the shared repository boundary and short request cache; React views consume it through `useCatalogData.ts`.
- `BuilderRepository` and `SupabaseBuilderRepository` provide the equivalent boundary for the public Builder; `storefrontBuilder.ts` owns its request cache and `useBuilderData.ts` exposes localized loading, retry, error, and empty states.
- `HomepageRepository` and `SupabaseHomepageRepository` provide the boundary for the ten fixed Homepage content slots; `storefrontHomepage.ts` owns its short request cache and `useHomepageContent.ts` exposes localized loading, retry, and error states. Operational details are in `docs/HOMEPAGE_CONTENT_ADMIN.md`.

Public repository queries explicitly require `PUBLISHED`, non-archived Products, active variants/relationships/media, and a public primary image. Database RLS remains authoritative and the query predicates keep behavior obvious in code.

Builder queries explicitly require `PUBLISHED`, non-archived flower/wrapping rows, active compatible colours, and active public media for flowers. An Admin session cannot widen these reads because the storefront uses the separate non-persisted public client.

## Controlled catalog import

The approved ten-Product fixture can seed an empty linked project without overwriting owner edits:

```powershell
npm run seed:live-catalog
npm run check:storefront-runtime
```

The importer verifies the linked project reference, uses deterministic identities, uploads validated image files to immutable Storage paths, inserts only missing records, and publishes only records that remain `DRAFT`. It does not restore `HIDDEN` or `ARCHIVED` Products and does not overwrite existing Admin-managed content. The runtime check compares VI/KO copy, variants, taxonomy, media, and public visibility against the approved import fixture.

The approved Builder fixture follows the same insert-only contract:

```powershell
npm run seed:live-builder
npm run check:builder-runtime
```

It imports eight flowers, three wrapping options, five colour variants, their compatibility rows, VI/KO content, and the approved existing photography. Operational details are in `docs/BUILDER_DATA_ADMIN.md`.

## Checkout anti-abuse configuration

The browser submits guest Checkout through `create-checkout-order`. That Edge Function verifies Cloudflare Turnstile, derives a short-lived throttle identifier from the platform-observed IP using HMAC-SHA-256, consumes the race-safe database throttle, then calls the internal order RPC with Supabase's server-provided service role. It never accepts a client-supplied IP and never logs the Turnstile token, secret, raw IP, or service-role credential.

Production requires these owner-managed values:

| Location | Name | Purpose |
|---|---|---|
| Cloudflare Turnstile widget | hostname `johnathanjjnbao.github.io` | The allowlist is a hostname, not `/lumea-flower-studio/`; do not add localhost to the production widget. |
| GitHub Repository Variable | `VITE_TURNSTILE_SITE_KEY` | Public production widget key used at frontend build time. |
| Supabase Edge Function Secret | `TURNSTILE_SECRET_KEY` | Production Siteverify secret; never use a `VITE_` name. |
| Supabase Edge Function Secret | `CHECKOUT_THROTTLE_HMAC_KEY` | At least 32 characters of cryptographically random secret material. |

The fixed widget and server action is `checkout_submit`. Production accepts only origin `https://johnathanjjnbao.github.io` and Siteverify hostname `johnathanjjnbao.github.io`. Localhost origins are enabled only when the Edge Function runs with `TURNSTILE_TEST_MODE=true`; local/test must use Cloudflare's official test site-key/secret pair.

To configure Edge secrets without placing them in shell history, copy `supabase/.env.example` to ignored `supabase/.env.local`, replace the HMAC placeholder, and then run:

```powershell
npx supabase secrets set --env-file supabase/.env.local --project-ref nihhynwvltttadlfatdm
```

Do not commit `supabase/.env.local`, paste its contents into chat, or expose either secret in browser code. Remove `TURNSTILE_TEST_MODE` or set it to `false` in production.

Use one coordinated release window because the security migration revokes the old browser RPC path. The safe order is:

1. Confirm the real Cloudflare widget, GitHub variable, and both Supabase secrets.
2. Deploy `create-checkout-order` with JWT verification disabled as declared in `supabase/config.toml`.
3. Apply the three reviewed Step 15 migrations, including the direct-RPC revoke.
4. Immediately deploy the matching frontend revision and monitor GitHub Pages.
5. Run anonymous/authenticated bypass probes, a real guest Checkout smoke test, and Admin → refresh → Storefront propagation checks.

Keep Checkout fail-closed during an incident. Do not restore the anonymous internal-RPC grant as a shortcut. Fix or roll forward the Edge Function/frontend, and retain the Cart/form state so customers can retry after service recovery.

## Verification

Run the focused remote smoke check without printing credentials:

```powershell
npm run check:supabase-foundation
```

It verifies the project URL, browser-safe key type, anonymous published read, anonymous Product-write denial, and private-upload isolation.

Then run:

```powershell
npm run check:storefront-runtime
npm run check:builder-pricing
npm run check:builder-persistence
npm run check:builder-runtime
npm run check:homepage-runtime
npm run check:checkout
npm run check:checkout-runtime
npm run check:step15
npm run typecheck
npm run build
npx supabase db lint --linked --level warning
npx supabase migration list
git diff --check
```

Inspect the final diff and secret scan before committing. `.env.local`, Supabase `.temp`, access tokens, database passwords, secret keys, and service-role keys must never be committed.
