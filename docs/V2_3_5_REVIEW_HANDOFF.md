# Luméa V2.3–V2.5 — reviewer preview handoff

For the final engineering/reviewer matrix and the 21 October refinement, see [the final project handoff](LUMEA_FINAL_PROJECT_HANDOFF.md).

**Status (2026-10-21):** The independent, bilingual reviewer demo is available at **https://johnathanjjnbao.github.io/lumea-review-preview/**. Open it on a phone or computer; no installation or account is needed. This public demo is **not** the production Luméa storefront, production acceptance, or a release of V2.2. V2.2 staging acceptance remains PASS; V2.2 has not been released to production.

## What to review

Luméa is a flower studio website designed to help someone discover an arrangement and request an order. Start on Home, explore the flower catalog, open a Product, add an available arrangement to Cart, and try the **demo-only** Checkout. Use the language switcher to compare Vietnamese and Korean. On a phone, check the menu and readability as well as the shopping flow. About, Contact, Same-day, and Policies are also in the menu.

The banner **“LUMÉA — BẢN XEM TRƯỚC / REVIEW DEMO”** marks illustrative products, prices, images, and business content. Checkout creates **no real order or payment**. Do not enter genuine personal or payment information. The public URL is not private, although the pages request that search engines not index them.

Feedback that would help: Which parts feel clear or confusing? Is the VI/KO wording natural? Do product images, descriptions, prices, and mobile layouts support a purchase decision? Is anything missing before a real launch?

## Public demo routes

The Home page has 10 sections. The main paths are Catalog `/flowers`, Product `/flowers/pink-garden`, Cart `/cart`, Checkout `/checkout`, About `/about`, Contact `/contact`, Same-day `/same-day`, and Policies `/policies`. Each has a Korean `/ko` version. Direct links and page refreshes work on the independent preview host. A READY demo Product can reach Cart and the local-only Checkout confirmation; SEASONAL Products cannot be purchased. Admin is intentionally unavailable in the public demo.

The demo uses public illustrative image URLs, so imagery needs an internet connection. It does not demonstrate real Admin editing, live inventory, owner-approved prices or policies, actual delivery/payment processing, or a production Checkout. No staging Home content was initialized for this preview.

Seven selective hosted QA screenshots are retained locally at `C:\Users\triba\AppData\Local\LumeaOps\reviewer-preview\screenshots` (`hosted-vi-home-1440.png`, `hosted-vi-home-390.png`, `hosted-ko-home-390.png`, `hosted-vi-catalog-1440.png`, `hosted-vi-pdp-1440.png`, `hosted-vi-cart-390.png`, `hosted-ko-checkout-390.png`). They are not uploaded to the public site.

## Run the preview

From the repository with existing dependencies installed:

```powershell
npm run dev:review -- --port 4174 --strictPort
```

Open `http://127.0.0.1:4174/lumea-flower-studio/`. The local preview needs no `.env.local`, Supabase login, or staging data. Existing illustrative images load from the public image URLs already used by the repository, so an internet connection is needed for full imagery. The local `review` build activates only on loopback; the distinct `review-hosted` build activates only on loopback or the exact independent GitHub Pages hostname and base path. Ordinary `dev` and production builds retain their live-data behavior. Both review builds refuse live Supabase access if served on an unintended host.

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

The original local 104 route/locale/viewport checks remain prior evidence. The public GitHub Pages URL was independently checked at 390, 768, and 1440 px across 13 VI/KO routes (78 combinations), followed by focused public Cart, KO Checkout, search, locale switch, direct-link refresh, navigation history, and 404 checks. No backend or order requests were observed. The seven new hosted screenshots are local QA evidence, not deployment artifacts.

## Boundaries and remaining release work

- No staging or production records, Auth, Storage, migrations, Orders, or environment settings were changed for this preview. No staging Home content was initialized.
- Live Admin persistence and owner-approved production imagery, prices, policies, and contact details require separate decisions and acceptance. The isolated public demo does not pass those production gates.
- The prior V2.3 editorial-route milestone added bilingual About/Contact/Same-day routes, managed-content integration, search/focus and hash navigation, and a local Admin Home-slot initializer. The initializer remains unused on staging. This Review Mode does not replace those live paths.
- Production recovery, V2.2 release, V2.3–V2.5 release approval, merge, and deployment remain separate permission-gated work.
