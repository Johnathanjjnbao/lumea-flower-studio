# Luméa Flower Studio

Luméa is a bilingual VI/KO floral-commerce V1 with a customer storefront and a Supabase-backed Admin workspace. Customers can browse ready-made flowers, build a bouquet, keep a mixed Cart, and submit a guest Order. The owner can manage the catalog, public content, delivery and payment settings, and the Order lifecycle without rebuilding the site.

## Live demo

- Website: [johnathanjjnbao.github.io/lumea-flower-studio](https://johnathanjjnbao.github.io/lumea-flower-studio/)
- Repository: [github.com/Johnathanjjnbao/lumea-flower-studio](https://github.com/Johnathanjjnbao/lumea-flower-studio)

The public demo is safe to explore. Admin credentials are private and are not included in this repository.

## Main features

### Customer experience

- Admin-managed Homepage, Visit details, contact information and social links
- Catalog, Product Detail, search and filters by occasion, tone and budget
- Ready-made and seasonal product availability
- Bouquet Builder with live pricing and compatibility rules
- Persistent Cart with server reconciliation before Checkout
- Guest Checkout for pickup or delivery, including same-day rules
- Cash and configurable bank-transfer/VietQR architecture
- Order confirmation with immutable price and fulfillment snapshots
- Vietnamese and Korean routes and interface copy
- Mobile-first layouts with tablet and desktop verification

### Admin experience

- Admin authentication and password recovery
- Products, variants, media and publication state
- Homepage, Site Profile, Visit/Maps and discovery content
- Builder flowers, wrapping options, pricing and compatibility
- Delivery zones, areas, fees, windows, pickup and same-day settings
- Payment-method configuration
- Order search, detail, status history and controlled lifecycle transitions

## Architecture

The frontend uses React, Vite and TypeScript. Supabase provides Postgres, Auth, Storage, RPCs and Edge Functions. GitHub Actions runs the release gates and deploys the static application to GitHub Pages. Cloudflare Turnstile protects guest Checkout.

Mutable business data follows one path:

```text
Admin -> Supabase -> Storefront
```

Checkout crosses a server-side trust boundary:

```text
Browser -> Turnstile -> Edge Function -> secure RPC
        -> authoritative pricing -> Order snapshots
```

The browser sends the customer's choices, but it does not decide the final price, delivery fee or accepted payment configuration.

## Security and reliability

- Postgres Row Level Security protects private and administrative records.
- V1 Admin permissions are restricted to the `ADMIN` role.
- Browsers cannot call the internal Checkout RPC directly.
- The Edge Function validates origin, hostname, Turnstile action, payload size and request format.
- Checkout uses server-observed IP throttling, HMAC protection and idempotency.
- Money is recalculated as integer VND values on the server.
- Order, payment and delivery transitions use optimistic concurrency controls.
- CI runs SQL authorization tests, browser smoke tests, dependency audit and secret scanning.
- Production secrets stay in Supabase or GitHub secret storage and are not exposed to the browser bundle.

See [the architecture document](docs/LUMEA_ARCHITECTURE.md) and [Supabase setup](docs/SUPABASE_SETUP.md) for the detailed boundaries.

## AI-assisted development

The project was developed with ChatGPT and Codex as implementation, review and QA tools. The owner defined requirements, evaluated proposed behavior, checked the site as a user, identified inconsistencies, requested corrections, reviewed regression evidence and accepted production results.

Codex helped turn the specification into scoped implementation stages, code changes, database migrations, automated checks, security reviews and deployment evidence. Decisions that affect business policy, production access or acceptance remained with the owner. This human-in-the-loop process is documented in [the V1 project summary](docs/FINAL_PROJECT_SUMMARY.md).

## Quality assurance

The release process checks more than a successful build:

- TypeScript and domain-contract checks
- Static and runtime integration checks
- Supabase SQL tests for RLS, RPC and role boundaries
- Browser coverage for Storefront, Cart, Checkout and Admin flows
- Responsive and production smoke testing
- Security review, dependency audit and current/history secret scans
- GitHub Actions gates before GitHub Pages deployment

The technical handoff describes the full test classes and release order in [V1_HANDOFF.md](docs/V1_HANDOFF.md).

## V1 status

**LUMÉA FLOWER STUDIO V1 — ENGINEERING COMPLETE**

Release: `v1.0.0`

Business launch: **OWNER CONFIGURATION REVIEW REQUIRED**

The application is deployed, but the owner must confirm the final logistics and operating policies before accepting real commercial Orders.

## Known limitations

- GitHub Pages uses `404.html` SPA recovery for dynamic Product and Admin Order deep links. The browser recovers, but the initial HTTP status is not ideal for SEO, link previews or uptime monitoring.
- Bank transfer/VietQR remains off until real bank details and the manual verification process are approved.
- Delivery zones, fees, windows and the same-day cutoff require owner confirmation as real business promises.
- The release did not include a specialist load test or a full browser/device matrix.

## Documentation

- [V1 project summary](docs/FINAL_PROJECT_SUMMARY.md)
- [10–20 minute reviewer guide](docs/REVIEWER_GUIDE.md)
- [Technical handoff](docs/V1_HANDOFF.md)
- [Owner operations runbook](docs/OWNER_RUNBOOK.md)
- [V1 release notes](docs/V1_RELEASE_NOTES.md)

## Future scope

Possible follow-up work includes rewrite-capable hosting, owner MFA adoption and a separately approved `STAFF` permission model. Customer accounts and other V2 features remain outside this release.
