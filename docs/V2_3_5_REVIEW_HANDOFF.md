# Luméa V2.3–V2.5 reviewer handoff (local work in progress)

**Status:** Customer-facing navigation and editorial-route milestone is implemented locally; the full V2.3–V2.5 brief is not yet accepted or released. V2.2 staging acceptance remains PASS; V2.2 has not been released to production.

## What this milestone changes

- Search in the header opens and focuses the real catalog search. Clicking it again while already in the catalog preserves the current filters and query.
- About, Contact, and Same-day have VI/KO routes. About uses Admin-managed `why_lumea` content; Contact uses the public Site Profile and managed Visit content; Same-day reads live Checkout options and published eligible Products. No route invents fees, delivery guarantees, legal terms, or contact details.
- Hash links wait for asynchronously loaded Home sections, focus interactive targets, and respect reduced-motion preferences.
- Home has a neutral, localized empty state when no managed section is enabled. A decorative florist budget now uses the managed budget-range label.
- Footer links lead to the new routes, and contact links use existing URL validation.

## Local preview

The local app must point to **staging only**. Populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the staging project's public API settings (see `.env.example`); never use a service-role or secret key. `VITE_TURNSTILE_SITE_KEY` is needed only for a Checkout submission, which is out of scope for reviewer preview. Do not submit an order.

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/lumea-flower-studio/`. The VI routes are `/`, `/flowers`, `/flowers/qa-ready-bouquet`, `/about`, `/contact`, `/same-day`, `/policies`, `/cart`, and `/checkout`. Prefix a route with `/ko` for Korean. `/admin/login` is available for authorized Admin review, but anonymous review must not be treated as an Admin acceptance test.

Optional local browser verification (requires Playwright for Python and an installed Edge browser):

```powershell
npm run check:v2-3-browser
```

Set `LUMEA_QA_SCREENSHOT_DIR` to a local directory to save mobile and desktop screenshots. The script reads public staging data, exercises local Cart persistence, and stops before any Order request.

## Verified on this branch

- VI/KO public routes, including Home, Catalog, READY QA PDP, Cart, Checkout pre-submit, Policies, About, Contact, and Same-day, were checked at 320, 390, 768, and 1440 px without horizontal overflow or browser exceptions. Anonymous Admin login was also checked at 390 px.
- READY QA image decoding, header search/focus/query preservation, keyboard skip link, reduced-motion navigation, and READY Product → Cart persistence → KO Cart/Checkout pre-submit were checked in a real browser. No staging mutation-capable request was observed.
- `check:ci`, TypeScript, build, secret scan, and diff whitespace checks passed for the initial milestone. Re-run after later changes.

## Reviewer limitations and remaining work

- Staging currently exposes **zero enabled Home sections**. The Home empty state is correct, but it is not the approved ten-section visual story. About and Visit are likewise sparse until owner-managed content is available. No staging content was changed in this milestone.
- Staging catalog items shown in the screenshots are explicitly QA fixtures, not owner-approved commercial Product imagery or copy. Do not treat them as final photography, pricing, or assortment.
- Checkout was reviewed only through the non-mutating form boundary; no Order was created. Authenticated Admin editing was not exercised in this milestone.
- V2.3–V2.5 design/content, Admin, and full reviewer-preview acceptance remain open. A shareable public preview has not been deployed. Production migrations, release, and recovery are separate, permission-gated work.
