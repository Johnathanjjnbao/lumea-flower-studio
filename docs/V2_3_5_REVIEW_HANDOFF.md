# Luméa V2.3–V2.5 — local reviewer preview handoff

**Status (2026-10-21):** A self-contained, bilingual reviewer preview is implemented locally on `v2-3-5-website-completion`. This is **not** production acceptance or release. V2.2 staging acceptance remains PASS; V2.2 has not been released to production.

## Run the preview

From the repository with existing dependencies installed:

```powershell
npm run dev:review -- --port 4174 --strictPort
```

Open `http://127.0.0.1:4174/lumea-flower-studio/`. The preview needs no `.env.local`, Supabase login, or staging data. Existing illustrative images load from the public image URLs already used by the repository, so an internet connection is needed for full imagery. Review Mode activates only for an explicitly selected Vite `review` mode on `localhost` or `127.0.0.1`; ordinary `dev` and production builds retain their live-data behavior. A Review Mode build also refuses live Supabase access if served outside loopback. Do not share it as a public site.

The persistent **REVIEW MODE** ribbon identifies illustrative data. Catalog prices, product imagery/copy, delivery choices, business guidance, and policy text in this mode are demonstrations, not owner-approved operating content. No official address or contact channel is invented. The real Admin area is replaced with an offline notice in Review Mode; this is not evidence of Admin acceptance.

## Reviewer route and content map

- VI Home `/` and KO Home `/ko`: 10 enabled sections—Hero, Occasions, Best Sellers, Budget, Same-day, Florist's Choice, Create Bouquet, Why Luméa, Gallery, Visit. There are six curated demo best sellers and 10 demo catalog products.
- Catalog `/flowers`, PDP `/flowers/pink-garden` (plus other demo slugs), bouquet builder `/create-bouquet`, Cart `/cart`, Checkout `/checkout` all have `/ko` counterparts.
- About `/about`, Contact `/contact`, Same-day `/same-day`, and Policies `/policies` are bilingual. Contact intentionally does not invent a phone, email, address, or social account.
- A READY product can be selected, added to Cart, edited/removed and taken through a demo Checkout form. A SEASONAL product remains non-purchasable. Checkout stops at a local-only completion screen: no Order, payment, personal data, or network mutation is sent. The Order Confirmation route cannot display a previously stored live receipt in Review Mode.
- The `/admin/*` route explains that real Admin requires authenticated, server-authorized access; it does not bypass Auth.

Review Cart uses a separate `lumea.review.cart.v1` browser storage key, leaving a live Cart untouched. All storefront data sources in Review Mode resolve to local fixtures. Supabase client creation and the Order repository are guarded against use in this mode. Demo copy is deliberately neutral wherever real commercial decisions are required; do not reuse it as published policy.

## Verification

```powershell
npm run check:ci
npm run typecheck
npm run build
npm run check:review-bundle -- normal
npm run build:review
npm run check:review-bundle -- review
npm run check:review-browser
npm run check:secrets
```

The Review Mode browser suite uses installed Playwright for Python and Edge. It checks 13 routes in VI/KO at 320, 390, 768, and 1440 px (104 route/locale/viewport checks), decoded imagery, no horizontal overflow, Home sections and actions, Cart edits, safe KO Checkout, missing live receipt on Order Confirmation, search/focus, locale switch, mobile keyboard navigation, and absence of Supabase/Order or mutation-capable requests. The normal-bundle check ensures Review Mode fixture markers are absent from the regular output. See the task's final report for the results of the latest full local run.

Selective screenshots live outside the repository at `C:\Users\triba\AppData\Local\LumeaOps\reviewer-preview\screenshots`. They cover materially changed pages and are local QA evidence, not deployment artifacts.

## Boundaries and remaining release work

- No staging or production records, Auth, Storage, migrations, Orders, or environment settings were changed for this preview. No staging Home content was initialized.
- Live Admin persistence, owner-approved production imagery/prices/policies/contact details, and a public shareable preview require separate decisions and acceptance. Do not infer those gates from local fixture QA.
- The prior V2.3 editorial-route milestone added bilingual About/Contact/Same-day routes, managed-content integration, search/focus and hash navigation, and a local Admin Home-slot initializer. The initializer remains unused on staging. This Review Mode does not replace those live paths.
- Production recovery, V2.2 release, V2.3–V2.5 release approval, merge, and deployment remain separate permission-gated work.
