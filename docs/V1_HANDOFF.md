# Luméa Flower Studio V1 Handoff

## Scope and release boundary

Luméa V1 is a bilingual, mobile-first flower-ordering storefront with a Supabase-backed Admin. It includes Homepage, Catalog, Product Detail, Builder, Cart, guest Checkout, Turnstile protection, Order confirmation, Admin authentication/recovery, Product/Homepage/Discovery/Builder/Operations/Order management, delivery zones/areas/windows, pickup, same-day settings, payment settings, Site Profile, Visit/Google Maps, VI/KO, responsive layouts, GitHub Pages hosting, and a Supabase database/Storage/Edge Function backend.

V1 intentionally excludes customer accounts, loyalty, reviews, subscriptions, coupons, automated payment reconciliation/webhooks, automated refunds, advanced inventory, multi-branch operation, a large analytics suite, marketplace/CRM features, and additional payment gateways. Bank transfer/VietQR may remain off without making the engineering release incomplete.

## Architecture and security summary

- React/Vite owns the typed UI, routing, validation presentation, accessibility, and bilingual interface copy.
- Supabase Postgres/Storage is the source of truth for mutable business data. Admin saves flow to the same records read by the Storefront.
- VND amounts are integers. Checkout treats browser totals only as review values; the trusted RPC revalidates availability, compatibility, price, delivery fee, fulfillment, and payment configuration, then writes immutable snapshots atomically.
- Guest order creation goes through `create-checkout-order`. The Edge Function requires the production origin, JSON content type, a bounded payload, a valid Turnstile token with `checkout_submit` action and exact hostname, and a server-observed IP protected by HMAC before consuming the database throttle.
- The internal order RPC and throttle are `service_role`-only. Admin reads/mutations require an active `ADMIN` at the database boundary. V1 intentionally denies `STAFF`.
- Buyer, recipient, address, message, Order, Payment, Delivery, and event data are private. Browser bundles receive only public Supabase/Turnstile keys; service-role, Turnstile secret, and throttle HMAC secret stay server-side.

Detailed entities and ownership remain canonical in [LUMEA_DATA_MODEL.md](./LUMEA_DATA_MODEL.md), [LUMEA_ARCHITECTURE.md](./LUMEA_ARCHITECTURE.md), and [LUMEA_ADMIN_SCOPE.md](./LUMEA_ADMIN_SCOPE.md).

## Quality gates

| Class | When | Coverage |
|---|---|---|
| A — every PR/main push | GitHub Actions | clean install, high-severity dependency audit, public-config validation, production build, typecheck/domain contracts, secret scan, lightweight Home/Catalog/Cart/Checkout/Admin-login browser smoke, and local Supabase SQL security tests |
| B — release | Before/after deploy | full local browser suites, Supabase runtime checks, RLS/RPC/grant probes, Admin/storefront propagation, deep-link and external-link checks, production customer/Admin smoke |
| C — manual/production | Owner or controlled release | real Turnstile challenge, real password-recovery email, optional MFA enrollment, and one clearly labelled Checkout happy-path Order when evidence is needed |
| D — optional/expensive | Periodic | broader device/browser matrix, accessibility specialist review, load testing, disaster-recovery exercise, and dependency/license review |

The deploy job runs only after both application quality and local-database security jobs pass. Actions are pinned to immutable commits, job permissions are least-privilege, and production secrets are not exposed to pull requests.

## Release and recovery

1. Review changes and run the local A/B checks.
2. Apply reviewed forward-only database migrations and deploy the matching Edge Function when either changed.
3. Push `main`; wait for both quality jobs and the GitHub Pages deploy to succeed.
4. Confirm the deployed commit, run production read-only smoke checks, and review the Admin Orders queue.
5. For a frontend regression, revert through Git and pass the same workflow. For database issues, prefer a reviewed forward migration; do not test destructive rollback in production.

Operational recovery and safe shutdown steps are in [OWNER_RUNBOOK.md](./OWNER_RUNBOOK.md). Supabase setup, security boundaries, and Checkout release ordering are in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Business-launch checklist

Engineering validity is separate from business truth. Before accepting real customer Orders, the owner must confirm the public name/contact/social links; pickup address/hours; delivery zones, supported areas, fees, windows and same-day cutoff; enabled payment methods and cash eligibility; bank/VietQR data if enabled; cancellation/refund/reschedule policy; surprise-contact policy; PII retention; backup/PITR expectations; and who monitors new Orders.

Values seeded or entered for QA remain **demo / owner review required** unless the owner explicitly confirms them. Disabled bank transfer/VietQR is a valid V1 configuration.

## Hosting limitation

GitHub Pages has no server-side rewrite for arbitrary React routes. Known dynamic paths such as `/flowers/:slug` and `/admin/orders/:id` can initially return HTTP 404 while the deployed `404.html` shell recovers the app in a browser. This is acceptable for the V1 portfolio/demo because navigation and refresh recover, but the status is suboptimal for SEO, link previews, and uptime monitoring. The static Admin reset path is emitted directly because recovery reliability matters. A future production-business launch should consider rewrite-capable hosting rather than adding a fragile routing hack.

## Project summary

Luméa Flower Studio V1 is a production-deployed VI/KO flower-commerce experience built with React, TypeScript, Vite, Supabase Postgres/Auth/Storage/Edge Functions, Cloudflare Turnstile, GitHub Actions, and GitHub Pages. Customers can discover ready-made and seasonal products, build bouquets, persist and reconcile a mixed Cart, choose pickup/delivery and payment, and place a guest Order through an abuse-resistant trusted boundary. The owner can manage the content and operational data that drive the storefront, then process Orders with controlled, auditable status transitions.

Development used an AI-assisted, specification-led workflow with scoped stages, owner gates, repository-grounded reviews, deterministic contract tests, browser automation, SQL security tests, manual production verification, and immutable-action pinning. Major milestones were the Supabase foundation, live Admin/content slices, unified Cart, trusted Checkout, Admin Orders, delivery/payment/VietQR operations, launch hardening, and final CI/security/handoff. Future work should prioritize owner-approved business policy, retention/backup operations, rewrite-capable hosting if SEO matters, scoped STAFF permissions, MFA adoption, and only then explicitly approved post-V1 features.
