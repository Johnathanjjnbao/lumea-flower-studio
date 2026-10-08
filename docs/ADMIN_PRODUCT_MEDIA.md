# Luméa Admin — Product & Media Operations

This guide covers the Step 9B Admin vertical slice and its Step 9C storefront propagation contract. Catalog, Product Detail, and the homepage featured-product rail now read published Product data from Supabase; the local catalog remains an explicit import fixture only.

Bouquet Builder flower, wrapping, compatibility, and media operations are documented separately in `docs/BUILDER_DATA_ADMIN.md`.

## Access and first Admin

Admin routes are Vietnamese-only:

- `/admin/login`
- `/admin`
- `/admin/homepage`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/:id`

Supabase Auth owns sign-in. The application accepts only an active `ADMIN` row in `public.admin_profiles` for Product/Media management. `STAFF` remains blocked until the owner approves its exact permissions. Route guards improve UX; RLS and Storage policies remain authoritative.

The first Admin must be bootstrapped by the owner:

1. Supabase Dashboard → Authentication → Users → create/invite the intended user.
2. Copy that user's UUID from the Dashboard.
3. Supabase Dashboard → SQL Editor, run a trusted insert using that UUID:

   ```sql
   insert into public.admin_profiles (auth_user_id, role, active, display_name)
   values ('AUTH_USER_UUID', 'ADMIN', true, 'Owner');
   ```

Do not share the password, access token, database password, `service_role`, or secret key in chat or source control.

Homepage copy, media, Gallery, and Best Sellers operations are documented in `docs/HOMEPAGE_CONTENT_ADMIN.md`.

## Product workflow

1. Sign in at `/admin/login`.
2. Open Products and create a draft.
3. Add a valid lowercase slug, type, availability, same-day eligibility, and order.
4. Add Product copy in both VI and KO tabs.
5. Add variants with stable lowercase codes, integer VND prices, VI/KO labels, active state, and order.
6. Choose seeded Occasion and Tone relationships.
7. Save the draft to receive a Product UUID.
8. Upload JPEG, PNG, WebP, or AVIF images. Storage keys are generated as `products/{productId}/{uuid}.{ext}`.
9. Edit and save VI/KO alt text, choose one primary image, and reorder gallery items.
10. Publish only when readiness checks pass. Hide removes the Product from public RLS reads; Archive is non-destructive.

There is no autosave. Success messages appear only after Supabase confirms the mutation. Product metadata, canonical Category, VI/KO copy, Variants/SKUs, Occasions, and Tones are committed by one ADMIN-only database transaction; any failed child write rolls back the complete save. An edited published Product is moved to `HIDDEN` and restored to `PUBLISHED` inside that same transaction, so a failed mutation never exposes or preserves a partial Product update. Publish remains an explicit lifecycle mutation after the atomic metadata save. Media upload is a separate compensating workflow because object Storage cannot join the Postgres transaction.

Removing an image deactivates the Product relation but deliberately keeps the Storage object and metadata until a later owner-approved cleanup policy exists.

## Production configuration

GitHub repository variables are required before deployment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use only the browser-safe `sb_publishable_...` value. The Pages workflow fails closed when either variable is absent and creates `404.html` from the SPA entry so direct Admin route refreshes resolve correctly.

## Verification

Run:

```powershell
npm run check:admin-foundation
npm run typecheck
npm run build
npx supabase db lint --linked --level warning
npx supabase migration list
```

Runtime acceptance requires a real Admin session: create a draft, upload an image, publish, verify the public Catalog and Product Detail after refresh, edit and re-verify, hide and verify public denial, then archive/retain the clearly labelled test record. Public reads use a separate non-persisted Supabase client so an Admin browser session cannot widen storefront visibility.
