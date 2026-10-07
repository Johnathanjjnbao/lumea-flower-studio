# Luméa Flower Studio — V1 Project Summary

## 1. Project overview

Luméa Flower Studio is a bilingual Vietnamese/Korean flower-ordering website. V1 combines a public storefront with a private Admin workspace, a managed Supabase backend and a controlled Checkout gateway.

The public experience covers product discovery, bouquet configuration, Cart and guest Checkout. Admin owns the business data shown by the storefront and provides the tools needed to manage content, delivery, payments and Orders.

The deployed V1 is available at [johnathanjjnbao.github.io/lumea-flower-studio](https://johnathanjjnbao.github.io/lumea-flower-studio/).

## 2. Goal

The project explores how a small floral studio could support the full path from discovery to an operational Order without maintaining separate content and commerce systems.

Three product requirements shaped the work:

- Customers should be able to choose an existing design or assemble a custom bouquet with little friction.
- Business-mutable content should come from Admin and appear on the storefront after refresh, without a rebuild.
- Checkout should treat price, availability, delivery and authorization as server-side responsibilities.

The result is a portfolio-grade V1 with a real deployment and operational backend. It is not presented as an already approved commercial launch because the owner still needs to confirm final logistics and policy values.

## 3. Technology

| Layer | Technology | Responsibility |
|---|---|---|
| Web application | React, TypeScript, Vite | Storefront, Admin UI, routing, validation feedback and localization |
| Backend | Supabase Postgres, Auth and Storage | Business data, authentication, media and protected records |
| Trusted operations | Postgres RPCs and Supabase Edge Functions | Checkout, authoritative price calculation and controlled mutations |
| Abuse protection | Cloudflare Turnstile | Human verification for guest Checkout |
| Delivery | GitHub Actions and GitHub Pages | Quality gates and static-site deployment |

The application uses a typed repository/domain structure rather than allowing pages to issue arbitrary database writes. Database migrations define the data model, access rules and stored procedures as versioned source.

## 4. Customer experience

The Homepage introduces the studio, featured products, occasions, same-day service and Visit information. Catalog discovery supports product search and filters for occasion, tone and budget. Product Detail presents availability, variants and pricing snapshots.

The Bouquet Builder lets a customer select flower stems, quantities and wrapping. Compatibility and publication rules prevent unavailable combinations from being treated as purchasable. Ready-made and Builder items can coexist in one persistent Cart.

Before Checkout, Cart data is reconciled against the server. Checkout supports pickup and delivery, delivery zones and areas, date/window selection, same-day cutoff rules, buyer and recipient details, surprise Orders, card messages and the payment methods enabled by Admin. A successful request produces an Order confirmation without exposing internal Order creation privileges to the browser.

Vietnamese and Korean routes share the same business data while presenting localized interface and managed copy.

## 5. Admin experience

Admin is restricted to authenticated `ADMIN` users in V1. It includes password recovery and the following operational areas:

- Products, variants, media, translations and publication state
- Homepage sections, featured content and bilingual copy
- Site Profile, public contact details, Instagram and Visit/Google Maps settings
- Discovery taxonomies such as occasions, tones and budget ranges
- Builder flowers, wrappings, prices, availability and compatibility
- Delivery zones, supported areas, fees, windows, pickup and same-day settings
- Payment-method configuration
- Order search, detail, payment/delivery state and auditable status history

Admin changes persist in Supabase. The storefront reads the same records, so a content or price change appears after refresh without a frontend deployment.

## 6. Checkout and Order architecture

Checkout uses a layered path:

```text
Customer browser
  -> Cloudflare Turnstile
  -> create-checkout-order Edge Function
  -> service-role-only Postgres RPC
  -> validated Order and immutable snapshots
```

The browser supplies product choices and customer-entered fields. The Edge Function validates the request boundary, including the allowed production origin, JSON content type, payload limits, Turnstile action and hostname. It also derives the request IP at the server boundary before applying the database throttle.

The database reloads the current catalog and operating configuration. It checks publication, availability, compatibility, fulfillment and payment rules, then recalculates subtotal, delivery fee and total in integer VND. The completed write stores product, price and fulfillment snapshots so later Admin edits do not rewrite Order history.

An idempotency key allows a safe retry to return the same Order. Optimistic concurrency prevents two Admin actions based on stale state from silently overwriting each other.

## 7. Security

The main security boundary is enforced below the UI:

- Row Level Security denies public access to private customer, Order, Payment and Delivery data.
- Admin RPCs check the active user's server-side `ADMIN` role.
- V1 denies `STAFF` even though the broader data model can support future roles.
- Anonymous and ordinary authenticated clients cannot execute the internal Checkout RPC.
- The service-role key, Turnstile secret and throttle HMAC key remain in server-side secret stores.
- Turnstile, request limits and throttling reduce automated abuse at the public gateway.
- Server-authoritative money prevents modified browser totals from becoming Order totals.
- Status transitions are explicit and recorded as history rather than arbitrary row edits.

Security review also covered GitHub Actions permissions, pinned workflow actions, dependency vulnerabilities, browser-exposed configuration and current/full-history secret scans.

## 8. Testing and QA

V1 was reviewed as an end-to-end product, with release evidence extending beyond frontend compilation:

- Static checks, TypeScript compilation and domain-contract tests
- Runtime checks against Supabase for catalog, Builder, Homepage, Checkout and Admin behavior
- SQL security tests for RLS, grants, direct-RPC denial and role boundaries
- Browser tests for Storefront, Cart, Checkout, authentication/recovery and Admin Orders
- Responsive reviews on mobile and desktop layouts
- Production checks for main routes, dynamic-route recovery, external links and browser console output
- A real Turnstile-protected Checkout verification performed during launch hardening
- Dependency audit, code/security review and secret scans

GitHub Actions separates application quality, local database security and deployment. The deploy job runs only after the required quality jobs pass.

## 9. AI-assisted workflow

The owner used ChatGPT and Codex throughout planning, implementation, review and release. Work was organized around a written product specification, a staged workflow and explicit review gates.

The owner supplied requirements and business context, evaluated proposed behavior, checked real user flows, identified inconsistencies, requested corrections and decided when production evidence was acceptable. Codex analyzed the repository, proposed scoped plans, implemented changes, prepared migrations and tests, investigated failures, reviewed security boundaries and gathered deployment evidence.

This process kept a person responsible for product intent and acceptance. AI accelerated implementation and analysis, while requirements, production authority and business decisions stayed with the owner. Failed tests and contradictory evidence were treated as work to resolve, rather than being hidden behind a successful build.

The project demonstrates the owner's ability to direct an AI coding workflow, evaluate outputs and maintain scope over a multi-stage application. It does not claim that the owner worked as a senior engineer or that AI completed the project without human review.

## 10. Major milestones

1. Public storefront, responsive visual system and bilingual routing
2. Product discovery, Product Detail and the Bouquet Builder
3. Architecture, data model and Admin scope locks
4. Supabase schema, Auth, Storage and Row Level Security foundation
5. Live Admin management for products, Homepage, discovery and Builder data
6. Persistent mixed Cart with server reconciliation
7. Trusted guest Checkout and atomic Order creation
8. Admin Orders with controlled lifecycle and history
9. Delivery, pickup, same-day, payment and VietQR configuration
10. Site Profile, Visit/Maps and launch hardening
11. Final security review, CI expansion, production QA and handoff
12. `v1.0.0` release package

## 11. Final state

STEP 16 passed and the V1 engineering scope is complete. The release is tagged `v1.0.0` and deployed through GitHub Pages.

Business launch remains subject to owner review. Delivery zones, fees, windows, cutoff and operating policies are configurable and functional, but baseline/demo values must not be presented as final business promises until the owner approves them.

## 12. Known limitations

- GitHub Pages returns an initial HTTP 404 for arbitrary dynamic Product and Admin Order paths before the SPA recovery shell loads. Navigation works in the browser, but SEO, link previews and uptime checks may interpret the first response incorrectly.
- Bank transfer/VietQR is deliberately disabled until real bank information and a manual verification process are approved.
- Logistics values and public business information still need final owner confirmation.
- TOTP MFA is available but enrollment is a manual owner action.
- The owner must confirm retention/privacy, backup/PITR and Order-monitoring responsibilities.
- QA did not include a specialist load test or an exhaustive browser/device matrix.

## 13. Suggested review questions

1. Is the architecture proportionate to the size and risk of this project?
2. Are the browser, Edge Function, RPC and database trust boundaries clear and defensible?
3. Does the release and QA process omit any important check for a project at this stage?
4. Was the human-in-the-loop AI workflow organized in a credible and reviewable way?
5. Does the project provide useful evidence for an entry-level AI Evaluator or LLM Analyst portfolio?
6. Which parts best demonstrate product judgment, testing discipline or technical reasoning?
7. If development continues, which three improvements should receive priority?
