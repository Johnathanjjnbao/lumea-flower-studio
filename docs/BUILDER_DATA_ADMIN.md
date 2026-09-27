# Luméa Admin — Bouquet Builder Data

This guide covers the Step 10 live-data contract for Create Your Bouquet. The public Builder reads published flower stems, wrapping options, wrapping colours, compatibility, translations, and media from Supabase. The original TypeScript dataset is retained only as the controlled initial-import fixture.

## Admin routes and access

Builder management is available to an authenticated, active `ADMIN` profile at:

- `/admin/builder/flowers`
- `/admin/builder/flowers/new`
- `/admin/builder/flowers/:id`
- `/admin/builder/wrappings`
- `/admin/builder/wrappings/new`
- `/admin/builder/wrappings/:id`
- `/admin/builder/wrappings/colors/new`
- `/admin/builder/wrappings/colors/:id`

`STAFF`, anonymous users, and ordinary authenticated users cannot mutate Builder data. The route guard improves the Admin experience; Supabase RLS and Storage policies remain authoritative.

## Flower workflow

1. Create a flower as `DRAFT` with a stable lowercase code, integer VND price per stem, availability, order, and complete VI/KO content.
2. Save once to receive a UUID.
3. Upload a JPEG, PNG, WebP, or AVIF image. The immutable path is `builder/flowers/{flowerId}/{assetId}.{ext}`.
4. Publish only after both translations and an active public image are present.
5. `AVAILABLE` flowers can be added in the public Builder. `UNAVAILABLE` flowers remain visible but cannot be added.
6. `HIDDEN` and `ARCHIVED` flowers are excluded from all public Builder reads.

The existing architecture models seasonal messaging with `seasonal_note_required`; availability itself remains the established `AVAILABLE` / `UNAVAILABLE` enum. Step 10 does not invent inventory quantities or a third availability state.

Publishing is fail-closed. Editing an already-published flower temporarily hides it while related rows are saved, then republishes only after the database readiness checks pass.

## Wrapping workflow

Wrapping data has three layers:

- A wrapping option, such as classic paper or layered wrap.
- A wrapping colour/variant, including a safe six-digit hex swatch.
- An explicit compatibility row connecting an option to an allowed colour, with an optional integer-VND price override.

Both wrapping options and colours require VI/KO names before publication. A wrapping option also requires at least one active, published compatible colour. A public price is calculated from the selected option plus the compatible colour override when present; otherwise the colour's own modifier is used.

Editing a published wrapping record hides it while its translations or compatibility are written, then republishes it. Hide and Archive remain explicit, non-destructive lifecycle actions.

## Public data and draft persistence

React pages do not query Supabase directly. `BuilderRepository` defines the public boundary, `SupabaseBuilderRepository` implements published reads, and `storefrontBuilder.ts` owns the short request cache. Production has no silent local fallback.

The browser draft stores only versioned stable codes and quantities. It never treats cached prices or names as authoritative. On restore, the draft is reconciled with the latest public catalog: hidden or archived entries are removed, unavailable quantities are removed, per-flower quantity is clamped to 20, invalid wrapping combinations are replaced with a current valid combination, and the total is recalculated from Supabase data. Locale switching preserves the same reconciled selection while changing VI/KO labels.

The completion object is versioned and carries flower UUIDs/codes and quantities plus wrapping option/colour UUIDs/codes. Display and price snapshots support the current confirmation UI only. A future Cart or Order service must reload and revalidate every referenced record and price; Step 10 does not create Cart integration.

## Controlled initial import

Seed an empty linked Builder catalog without overwriting owner-managed records:

```powershell
npm run seed:live-builder
npm run check:builder-runtime
```

The importer verifies the linked Luméa project, uses deterministic identities, uploads the approved existing images, inserts only missing records, and publishes only records that remain `DRAFT`. It never restores `HIDDEN` or `ARCHIVED` records.

## Verification and production QA

Run the focused checks:

```powershell
npm run check:builder-pricing
npm run check:builder-persistence
npm run check:builder-runtime
npm run check:admin-foundation
npm run typecheck
npm run build
npx supabase db lint --linked --level warning
npx supabase migration list
git diff --check
```

For controlled production QA, use clearly labelled temporary records. Verify Draft, Published, edited VI/KO content, pricing, image propagation, unavailable behavior, compatibility, Hidden, Archived, and public semantics while the same browser has an Admin session. Finish by archiving every QA flower, wrapping option, and colour so none remains in the public Builder. Do not mutate owner catalog records for QA.

Image deletion is deliberately non-destructive: a record may be detached or archived while its Storage object and media history remain until an owner-approved cleanup policy exists.

The current shared upload validator enforces the approved JPEG, PNG, WebP, and AVIF MIME allowlist. A final owner-approved byte and dimension limit is still intentionally unresolved; this does not widen the accepted file types and does not block Step 10.
