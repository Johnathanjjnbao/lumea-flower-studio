# Codebase Concerns

## Top risks

| Severity | Concern | Evidence | Impact | Suggested action |
|---|---|---|---|---|
| high | V2 migrations have not run in a real Postgres test environment on this workstation | Docker unavailable; `supabase test db` requires it | SQL runtime issues could remain despite parser/static tests | run CI database-security job before merge/deploy |
| medium | Production business policies remain owner-controlled and may be intentionally disabled | `docs/OWNER_RUNBOOK.md` | site is not commercially ready solely because V2.1 code passes | complete operational readiness phase |
| medium | GitHub Pages provides no server runtime | `vite.config.ts`, workflow | all sensitive logic depends on Supabase boundaries | keep RPC grants/RLS/Edge secrets under regression tests |

## Technical debt

| Item | Why | Where | Risk | Suggested fix |
|---|---|---|---|---|
| Hand-maintained compact Admin JSX | inherited V1 style | `src/features/admin/pages/` | harder review and targeted UI testing | refactor only in a scoped later phase |
| No coverage metric | script-first QA history | `package.json` | unmeasured branch gaps | add coverage after choosing a standard test runner |
| Local catalog fallback | offline/demo continuity | `src/features/catalog/data/localCatalogRepository.ts` | can diverge from production data | keep production Supabase required and test parity |

## Security concerns

| Risk | OWASP | Evidence | Mitigation | Gap |
|---|---|---|---|---|
| Unauthorized commerce mutation | A01 | V2 migrations | ADMIN checks, RLS, narrow grants, atomic Product RPC | needs pgTAP execution for V2 |
| Client price/SKU tampering | A04 | checkout migration | service-role RPC validates current DB identity/prices | requires deployed test-environment verification |
| Unsafe external navigation | A03/A10 | navigation migration/types | HTTPS allowlist; no server fetch | operator still owns destination trust |
| Secret exposure | A02 | secret scan and env templates | public/server env separation | GitHub secret scanning setting is external to repo |

## Performance and fragile areas

| Area | Concern | Safe strategy |
|---|---|---|
| Catalog nested Supabase select | query grows with Products/translations/media | profile before pagination; preserve selected columns |
| Checkout migration wrapper | security/idempotency critical | modify only with SQL concurrency and runtime tests |
| Generated database types | large mechanical file | regenerate from migrated schema before merge if test DB is available |

## `[ASK USER]` questions

1. [ASK USER] Which non-production Supabase environment should receive the V2.1 migrations for runtime acceptance before any production rollout?
2. [ASK USER] Who owns operational monitoring and rollback approval for the eventual V2 deployment?

## Evidence

- `docs/V2_1_CONTEXT_MAP.md`
- `supabase/migrations/20261008090200_v2_commerce_checkout.sql`
- `supabase/migrations/20261008090300_v2_commerce_atomic_product.sql`
- `.github/workflows/deploy.yml`
- `scripts/check-secrets.mjs`
