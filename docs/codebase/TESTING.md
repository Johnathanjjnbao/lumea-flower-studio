# Testing Patterns

## Stack and commands

- Assertions: Node `assert/strict` for unit/contract/runtime scripts.
- Browser: Python Playwright.
- Database: pgTAP through `supabase test db`.

```bash
npm run check:ci
npm run check:v2-commerce
npm run typecheck
npm run build
supabase test db
npm run check:browser-smoke
```

## Layout and scope

| Scope | Covered? | Typical target | Evidence |
|---|---|---|---|
| Unit/domain | yes | Cart, Checkout, validation, navigation mapping | `scripts/check-cart.mjs`, `scripts/check-v2-commerce.mjs` |
| Integration/runtime | yes | live Supabase public/admin/checkout contracts | `scripts/check-*-runtime.mjs` |
| Database | yes in Docker/CI | migrations, RLS, grants, concurrency | `supabase/tests/` |
| Browser E2E | yes | routes, Checkout, Admin Orders | `scripts/check-*-browser.py` |

## Isolation strategy

- Pure checks load TypeScript through Vite or Node type stripping.
- Browser tests use a local preview and intercept network boundaries where a production write is inappropriate.
- SQL tests run inside transactions against disposable local Supabase and roll back.

## Quality signals and gaps

- No line-coverage threshold or coverage tool is configured; behavior contracts are the primary signal.
- Current workstation lacks Docker, so new V2 migrations cannot be executed locally until CI or another test environment runs them.
- Production verification is intentionally not evidence for un-deployed V2 code.

## Evidence

- `package.json`
- `.github/workflows/deploy.yml`
- `requirements-qa.txt`
- `scripts/check-v2-commerce.mjs`
- `supabase/tests/`
