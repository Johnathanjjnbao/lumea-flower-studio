# Luméa V2.2 — Product Detail + Commercial Policies

**Status (2026-10-19):** V2.2 staging acceptance is **PASS** on `puzuubnxarmviwgpjclj`. The branch remains `v2-product-detail-policies` at `db881d89dd15391ef394923744e2f3308938bc99`; V2.2 has not been merged or released to production. Staging migration history contains `20261016090000`, `20261016090100`, `20261017090000`, and `20261018090000`. Hosted CI, Product RPC P01–P15, SEASONAL image/browser QA, authenticated Commercial Policy RPC acceptance, owner-approved VI/KO publication, and public browser QA all passed. Production migration, deployment, and owner go/no-go remain separate gates.

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

Product-specific copy remains in `product_translations` through nullable `care_instructions`, `freshness_seasonality_note`, `substitution_note`, and `fulfillment_note`. The applied forward-only `20261017090000` fix preserves existing guidance on legacy UPDATE when these keys are omitted, while new rows default to `NULL`. It corrects the earlier `90100` wrapper behavior that could erase owner-entered guidance. The applied `20261018090000` follow-up normalizes ASCII whitespace-only guidance (space, tab, LF, CR, form feed, vertical tab) without removing meaningful internal whitespace.

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

The V2.1 Product function is retained as a non-browser-callable internal function and wrapped by the V2.2 `admin_save_product_atomic`. Guidance validation occurs before the existing atomic Product mutation, and all writes share the same database transaction. The applied forward fixes preserve omitted guidance keys on UPDATE independently for each of the four fields in VI and KO; explicit JSON `null`, empty text, or ASCII whitespace-only text clears the targeted field; a valid string is trimmed and saved; invalid type or oversize content rejects the entire call. The existing `SECURITY DEFINER`, empty `search_path`, ADMIN check, and execute grants remain unchanged. Checkout, Cart, Order snapshots, Category, Navigation, pricing, and service-role boundaries are unchanged.

## Verification evidence

- `npm run check:ci`: PASS, including the V2.1 commerce suite and `check:v2-2-commercial-content`.
- `npm run build`: PASS.
- `git diff --check`: PASS at implementation review.
- `scripts/check-v2-2-browser.py`: PASS with mocked public/Admin Supabase contracts at 390, 768, and 1440 px for VI/KO PDP, exact-locale/default/missing behavior, disclosure focus, safe inquiry links, public policy routes, Draft visibility, READY Cart/Checkout entry, SEASONAL purchase lock, policy editing/publish validation/preview, and atomic Product-guidance payload.
- `scripts/check-v2-commerce-browser.py`: PASS for V2.1 Category, Navigation, Product/SKU, Cart, Checkout, and Admin regressions.
- [Earlier GitHub Actions run 38885440061](https://github.com/Johnathanjjnbao/lumea-flower-studio/actions/runs/38885440061) on `bd3e937`: PASS for the initial two V2.2 migrations, six pgTAP files/27 assertions, database lint, and quality; production deploy was skipped. This is historical evidence, not the final migration baseline.
- [Hosted CI run #46](https://github.com/Johnathanjjnbao/lumea-flower-studio/actions/runs/39118292902) on `db881d89dd15391ef394923744e2f3308938bc99`: `quality` and `database-security` SUCCESS, `deploy` SKIPPED. The hosted fresh-database migration/lint run passed; seven pgTAP files/28 assertions passed, including the V2.1 regressions and `v2_2_legacy_product_guidance.sql` rollback/ASCII-whitespace cases. No production deployment was authorized by this acceptance.
- Staging migration history read-back on 2026-10-19 confirms all four V2.2 versions above. Real authenticated Product RPC acceptance P01–P15 PASS on the dedicated QA DRAFT Product; failed late-write rollback and unauthorized requests left the QA and reference Products unchanged. The QA Product remains DRAFT. The controlled pgTAP rollback evidence remains distinct from staging evidence.
- Real Policy RPC acceptance on staging: anon lacks EXECUTE (`42501`); ordinary and STAFF Auth users were rejected by the server-side ADMIN check (`42501`); an ADMIN publish request missing KO was rejected (`22023`). Targeted read-back after each denied request showed `FLOWER_CARE_DEFAULT` unchanged as DRAFT with no translations.
- The owner approved the six VI/KO policy copies and confirmed an active public Site Profile contact channel. The real QA ADMIN published `FLOWER_CARE_DEFAULT` first, then the other five sections through `admin_save_commercial_content`. Read-back immediately after each save confirmed exact approved VI/KO title/summary/body, `PUBLISHED` visibility, and no change to other sections. Final staging read-back found six Published sections and twelve exact translations; Admin showed VI ✓ / KO ✓ for all six.
- Real public browser QA after publication: `/policies`, `/ko/policies`, and READY/SEASONAL PDPs in VI/KO passed at 390, 768, and 1440 px (18 page/viewport combinations). Checks covered exact policy rendering, PDP summaries, care/freshness fallback on READY, disclosure interaction, policy links, validated contact channels, image decoding, SEASONAL purchase lock, no horizontal overflow, no console/page errors, and no Checkout/Order write request. The earlier SEASONAL staging image/media browser gate remains PASS and was not reworked here.

## Remaining release gates

The six staging policies were published only after owner approval of their VI/KO wording and business decisions. `DELIVERY` and `PAYMENT` describe options dynamically from Checkout; `FRESHNESS_SUBSTITUTION_DEFAULT` commits to consultation before substitution; `RETURNS_REFUNDS` describes case-by-case review without excluding applicable customer rights. The staging publication is not a legal-compliance opinion or approval to reuse QA operational settings in production.

Before production release: confirm final business/legal copy and actual production Delivery/Payment/Site Profile configuration; preflight production identity, migration history, drift, and the exact ordered migration set; establish an owner-approved backup/recovery approach (staging had PITR disabled and no verified restore-capable backup); obtain separate authorization for production migration, merge/deployment, and production smoke tests. Do not promote staging-only QA Products, Auth identities, or illustrative Storage assets as business content. The owner retains the final go/no-go decision. No production system was changed during this staging acceptance.
