# Luméa Homepage Content Admin

STEP 10.6 moves the existing Homepage business copy, photography, and Product curation to Supabase while preserving the approved React layout and visual lock.

## Managed Homepage sections

`/admin/homepage` exposes ten fixed sections in their React-owned order:

1. Hero
2. Occasions
3. Best Sellers
4. Budget
5. Same-day
6. Florist's Choice
7. Create Your Bouquet
8. Why Luméa
9. Gallery
10. Visit / Studio

The Admin can edit the copy fields that already exist for each section, in separate Vietnamese and Korean tabs. Hero and other critical story sections remain structurally fixed. Optional promotional sections can be hidden where the Admin UI offers a visibility control; hiding a section does not delete its content.

React continues to own component hierarchy, section order, layout, typography, responsive behavior, motion, image crops, and decorative assets. The CMS does not accept arbitrary HTML, CSS, scripts, blocks, or layout changes and is not a page builder.

## Media

Homepage images use the shared `public-media` bucket and `media_assets` model. New files are stored under `homepage/{sectionKey}/...`; the database retains bucket and storage path as identity. Image replacement creates a new immutable media asset and moves the Homepage relation to it. It does not hard-delete the previous Storage object.

Every managed image exposes Vietnamese and Korean alt text. Gallery items also support localized captions. Gallery supports add, deactivate, and atomic reorder operations, with at most ten active items to preserve the approved layout. Hero images retain their existing priority loading behavior; Gallery remains lazy-loaded.

The current upload validator accepts JPEG, PNG, WebP, and AVIF. A final owner-approved byte and dimension policy remains a known limitation shared with Product and Builder media.

## Best Sellers curation

The Homepage stores only Product IDs and display order. Product name, translation, image, visibility, and price continue to come from the Product source of truth. The picker lists only `PUBLISHED`, non-archived Products and accepts at most six. The public repository applies the same explicit visibility rules even when an Admin session exists in the browser.

## CTA and localization behavior

CTA destinations are selected from a fixed internal allowlist. Arbitrary URLs and `javascript:` input are not accepted. Internal routing retains the active VI or KO locale through the existing route helper.

Public Homepage queries select the requested locale only. Saving Vietnamese copy does not rewrite Korean copy. The public client is non-persisted and uses a separate storage key, so an authenticated Admin session cannot widen storefront reads.

## Data and RLS

The managed model consists of:

- `homepage_sections`
- `homepage_section_translations`
- `homepage_section_media`
- `homepage_feature_items`
- `homepage_feature_item_translations`
- `homepage_product_curations`

Anonymous users can read only enabled sections, active relations, active public media, and curated public Products. Anonymous writes are denied. Only an active `ADMIN` may write Homepage records or execute the curation/reorder functions; `STAFF` remains denied.

The storefront uses the Homepage repository boundary and a short request cache. It has no production static-content fallback. A failed request renders a restrained retry state rather than stale fixture content.

## Seed and verification

The deterministic import preserves the approved VI/KO copy, current photography, six featured Products, CTA targets, and section order. It inserts missing records and does not overwrite owner-edited rows on rerun.

```powershell
npm run seed:live-homepage
npm run check:homepage-runtime
npx supabase migration list
npx supabase db lint --linked --level warning
npm run typecheck
npm run build
```

## Known boundaries

- Phone, email, and social links remain global `siteConfig` fields. A future Site Settings scope should manage them rather than expanding Homepage CMS.
- Budget thresholds, delivery cutoff rules, taxonomy identity, and Builder logic remain owned by their existing domains.
- There is no preview iframe, autosave, content version history, global section reorder, or permanent media cleanup in this step.
