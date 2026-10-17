# Luméa V2.2 — Product Detail + Commercial Policies

**Status:** V2.2 remains on `v2-product-detail-policies` and is not released. The two original V2.2 migrations (`20261016090000` and `20261016090100`) were applied to staging during the earlier authorized acceptance work; they have not been applied to production. A legacy Admin UPDATE data-loss defect was then identified in the applied `90100` Product wrapper. The forward-only local fix `20261017090000_v2_2_preserve_omitted_product_guidance.sql` is not applied to staging or production. Its new pgTAP regression suite and fresh-database lint have not yet run on GitHub-hosted CI. Do not mark V2.2 staging PASS.

## Purpose and scope

V2.2 gives customers owner-controlled commercial context before purchase without duplicating Checkout or turning the site into a generic CMS. Product Detail keeps gallery, variant/tone selection, price, availability, Cart SKU flow, and the non-purchasable `SEASONAL` state. Delivery date, delivery window, and card message remain in Checkout.

Privacy, terms, retention, ticketing/CRM, cancellation actions, and final legal/business wording are outside this implementation. No migration seeds published policy copy.

## Content architecture

Global content is limited to six immutable codes:

- `DELIVERY`
- `RETURNS_REFUNDS`
- `PAYMENT`
- `CONTACT_INQUIRY`
- `FLOWER_CARE_DEFAULT`
- `FRESHNESS_SUBSTITUTION_DEFAULT`

`commercial_content_sections` owns fixed identity, Draft/Published state, bounded order, and timestamps. `commercial_content_translations` owns bounded VI/KO title, summary, and plain-text body. React owns layout and stable anchors; raw HTML, scripts, arbitrary links, arbitrary page types, and custom content blocks are not accepted.

Product-specific copy remains in `product_translations` through nullable `care_instructions`, `freshness_seasonality_note`, `substitution_note`, and `fulfillment_note`. With the forward fix, old Product payloads that omit these keys create new rows with `NULL` guidance but preserve existing guidance on UPDATE. The applied `90100` wrapper instead interpreted omitted keys as `NULL` on UPDATE and could erase owner-entered guidance.

## Locale and fallback contract

- Global commercial policies are queried for the requested locale only. Korean commercial content never silently falls back to Vietnamese.
- Care uses Product same-locale copy, then the Published `FLOWER_CARE_DEFAULT` translation for that locale, then a neutral unavailable state.
- Freshness/substitution uses Product same-locale copy, then the Published `FRESHNESS_SUBSTITUTION_DEFAULT` translation for that locale, then a neutral unavailable state.
- Draft, incomplete, failed, or missing content never fabricates commercial wording.
- Existing non-policy Product localization keeps its established behavior.

## Admin ownership

Commercial Policies presents six fixed cards with VI/KO tabs, completion state, bounded plain-text inputs, preview, Draft save, and explicit publish confirmation. Publishing requires complete VI and KO title/summary/body in the browser and database. Operational Delivery/Payment and Site Profile remain separately linked sources of truth.

Product Editor exposes the four optional guidance fields per locale. They are included in `admin_save_product_atomic`; there is no second Product mutation.

## Storefront behavior

- `/policies` and `/ko/policies` render only Published sections with exact-locale copy and safe line-break preservation.
- Product Detail shows Delivery and Returns/refunds summaries below purchase controls, then native keyboard-accessible disclosures for Delivery/pickup, Returns/refunds, Care, Freshness/substitution, and Payment.
- Same-day display combines Product eligibility with the existing safe public Checkout-options contract. It remains informational; Checkout owns authoritative zone, fee, date, cutoff, and window validation.
- Payment display uses only enabled-method booleans from that public contract. It never reads private payment settings or bank details.
- Inquiry stays outside the disclosure stack and exposes only validated Site Profile phone, email, and allowlisted Instagram actions.

## Security boundaries

Anonymous and authenticated public reads are SELECT-only and limited by RLS to Published sections/translations. Draft remains visible only to an active ADMIN. `admin_save_commercial_content` is `SECURITY DEFINER`, uses an empty `search_path`, schema-qualified objects, bounded inputs, a server-side active-ADMIN check, one atomic translation/state transaction, and execute only for `authenticated`; `anon` has no execute permission.

The V2.1 Product function is retained as a non-browser-callable internal function and wrapped by the V2.2 `admin_save_product_atomic`. Guidance validation occurs before the existing atomic Product mutation, and all writes share the same database transaction. The forward fix changes only guidance UPDATE semantics, independently for each of the four fields in VI and KO: an absent key preserves the existing value; explicit JSON `null`, empty text, or whitespace clears it; a valid string is trimmed and saved; invalid type or oversize content rejects the entire call. The existing `SECURITY DEFINER`, empty `search_path`, ADMIN check, and execute grants remain unchanged. Checkout, Cart, Order snapshots, Category, Navigation, pricing, and service-role boundaries are unchanged.

## Verification evidence

- `npm run check:ci`: PASS, including the V2.1 commerce suite and `check:v2-2-commercial-content`.
- `npm run build`: PASS.
- `git diff --check`: PASS at implementation review.
- `scripts/check-v2-2-browser.py`: PASS with mocked public/Admin Supabase contracts at 390, 768, and 1440 px for VI/KO PDP, exact-locale/default/missing behavior, disclosure focus, safe inquiry links, public policy routes, Draft visibility, READY Cart/Checkout entry, SEASONAL purchase lock, policy editing/publish validation/preview, and atomic Product-guidance payload.
- `scripts/check-v2-commerce-browser.py`: PASS for V2.1 Category, Navigation, Product/SKU, Cart, Checkout, and Admin regressions.
- `supabase/tests/v2_2_commercial_content.sql`: added for fixed codes, RLS, grants, ADMIN/STAFF/ordinary-user boundaries, VI/KO publication, invalid locale, rollback, guidance, and old Product-payload compatibility. It has not run against a database on this PC.
- [GitHub Actions run 38885440061](https://github.com/Johnathanjjnbao/lumea-flower-studio/actions/runs/38885440061) on `bd3e937`: PASS. Hosted runner applied all migrations from a fresh database, including exactly the two V2.2 files; `supabase db lint --local --schema public --level error --fail-on error` found no schema errors; all six pgTAP files passed (27 assertions), including V2.1 and V2.2. The quality job passed and the production deploy job was skipped.
- `supabase/tests/v2_2_legacy_product_guidance.sql` is a new rollback-safe regression for full VI/KO creation, legacy UPDATE preservation while name/price change, per-field omission versus explicit update, JSON-null/blank clearing, locale isolation, invalid/oversize rejection, legacy CREATE, non-ADMIN denial, RPC grants/attributes, and a controlled late KO guidance trigger failure after the internal Product/variant and VI guidance writes. The failed call must leave Product name, variant price, and both locales' guidance unchanged. This new suite is prepared for the existing GitHub-hosted `database-security` job; it has not run locally or in hosted CI yet. The earlier green run above does not cover this fix.

## Required owner content and remaining gate

All six records start as Draft without invented translations. The owner must supply and approve final VI/KO delivery, returns/refunds (including any cancellation/rescheduling wording), payment, inquiry, care, and freshness/substitution text before publication. This implementation does not claim legal or commercial compliance.

Before staging acceptance, push the reviewed branch only with owner authorization to run the hosted fresh-database migration/lint/pgTAP job, then verify staging project `puzuubnxarmviwgpjclj` and present a dry-run containing only the new forward migration for separate owner approval. Do not apply it remotely without that approval. Real authenticated ADMIN Product/policy RPC acceptance still requires a staging-only QA identity and bounded fixture plan; the SEASONAL QA image remains a separate unresolved browser-QA issue. No fake legal text should be published. Production migration, deployment, and merge require separate owner authorization and compatibility review.
