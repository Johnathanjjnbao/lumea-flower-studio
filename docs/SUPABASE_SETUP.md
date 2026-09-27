# Luméa Supabase Setup

This guide is the operational reference for the Step 9A Supabase foundation. Step 9B Product/Media operations are documented in `docs/ADMIN_PRODUCT_MEDIA.md`. Cart, checkout, orders, and Builder persistence remain out of scope.

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
```

Only a browser-safe `sb_publishable_...` key may use the `VITE_` prefix. Do not add a secret key, legacy `service_role` key, database password, or CLI access token to frontend environment files.

`.env.local`, `.env`, and `.env.*` are ignored by Git. `.env.example` is intentionally tracked and contains names only.

The frontend client is lazy and optional during Step 9A. A build without both public values keeps the current local-data storefront working. Supplying only one value, an invalid URL, or a non-publishable key produces a clear configuration error when the Supabase client is requested.

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

Step 9A implements only the first Product and Media foundation:

- Product identity, type, visibility, availability, merchandising flags, same-day eligibility, ordering, and archive timestamps.
- VI/KO Product translations with unique `(product_id, locale)` identity.
- Explicit integer-VND Product variants and VI/KO variant translations.
- Stable media records, localized alt text/captions, and ordered Product image placements.
- Occasion and tone taxonomy with localized labels and Product relations.
- Supabase Auth-linked `ADMIN` and `STAFF` application profiles.

Product price is derived from active variants; there is no duplicate mutable Product base-price column. Visibility and availability remain separate. A `PUBLISHED + UNAVAILABLE` Product may be visible while not purchasable.

Publishing a Product requires Vietnamese copy, at least one active priced variant for Product-backed bouquet types, and one active public primary image. The database permits only one active primary image per Product.

Cart, checkout, orders, payments, delivery, customers, custom requests, and Builder persistence are deliberately absent.

## Auth and roles

Supabase Auth owns identity. `public.admin_profiles` maps an Auth user to the application role.

- Active `ADMIN` profiles can manage the Step 9B Product/Media slice. `STAFF` remains blocked until the owner approves exact permissions.
- Only an active `ADMIN` profile can manage Admin profile rows.
- Public or ordinary authenticated users cannot create a profile or promote themselves.
- UI route guards are not authorization; RLS remains authoritative.

No Auth user or fake Admin is created by migration. Before Step 9B runtime testing, the owner must create the first Auth user through Supabase Auth. A trusted database owner then adds the initial `ADMIN` profile. Do not insert directly into `auth.users` and do not bootstrap the first role from the public client.

Detailed STAFF permissions remain an owner decision. The Step 9B forward migration narrows catalog/media mutation to ADMIN-only; staff and Admin-profile management also remain ADMIN-only.

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
- `flowers/{flowerId}/{assetId}.{ext}`
- `wrapping/{wrappingId}/{assetId}.{ext}`
- `custom-requests/{requestId}/{assetId}.{ext}` in `private-uploads`

The original filename is metadata only and must never be the object identity. Public users cannot upload, update, or delete Storage objects. Private bucket objects are never public-read.

For `public-media`, public read means fetching an object from an exact known public URL. Anonymous bucket/object listing is disabled; public paths come from RLS-filtered `media_assets` records attached to published content.

## RLS posture

RLS is enabled on every Step 9A business table.

- Anonymous/public reads expose only published, non-archived Products and taxonomy.
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
- `LocalCatalogRepository` adapts the current demo products and remains the active source during Step 9A.
- `SupabaseCatalogRepository` is available for the later controlled data-source switch.
- `src/lib/supabase.ts` owns the single lazy browser client.

The storefront is not switched to live Supabase data until Product/Admin propagation and empty/loading/error states are verified in the later storefront migration step.

## Verification

Run the focused remote smoke check without printing credentials:

```powershell
npm run check:supabase-foundation
```

It verifies the project URL, browser-safe key type, anonymous published read, anonymous Product-write denial, and private-upload isolation.

Then run:

```powershell
npm run typecheck
npm run build
npx supabase db lint --linked --level warning
npx supabase migration list
git diff --check
```

Inspect the final diff and secret scan before committing. `.env.local`, Supabase `.temp`, access tokens, database passwords, secret keys, and service-role keys must never be committed.
