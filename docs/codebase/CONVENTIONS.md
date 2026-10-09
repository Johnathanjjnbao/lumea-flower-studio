# Coding Conventions

## Naming rules

| Item | Rule | Example | Evidence |
|---|---|---|---|
| Components | PascalCase | `AdminCategoriesPage` | `src/features/admin/categories/AdminCategoriesPage.tsx` |
| Functions/hooks | camelCase; hooks start `use` | `usePublishedCategories` | `src/features/catalog/useCatalogData.ts` |
| Types | PascalCase | `CatalogProductRecord` | `src/features/catalog/data/catalogRepository.ts` |
| DB/env constants | snake_case in SQL; upper snake env | `category_id`, `VITE_SUPABASE_URL` | migrations, `.env.example` |

## Formatting and linting

- TypeScript strictness is enforced by `tsc -b`; no separate formatter or linter is configured.
- JSX style is compact in existing Admin pages; preserve local style unless a scoped readability refactor is approved.
- Run `npm run typecheck`, relevant `check:*` commands, and `npm run build`.

## Imports and modules

- External packages precede relative feature imports.
- Relative imports are standard; there are no path aliases or broad barrel exports.
- Keep pure domain logic separate from Supabase repositories and React pages.

## Errors and logging

- Repositories convert provider failures to bounded user-safe errors.
- The checkout gateway returns allowlisted public error codes; SQL/stack details are not returned.
- Never log Turnstile tokens, service-role keys, buyer/recipient PII, or bank secrets.

## Testing

- Deterministic checks live under `scripts/check-*.mjs`; browser checks use `scripts/check-*-browser.py`.
- SQL authorization and behavior tests live under `supabase/tests/` and run against a disposable local database in CI.
- Network/browser mocks are installed before page navigation and reset per script.

## Evidence

- `tsconfig.app.json`
- `package.json`
- `src/features/checkout/repository.ts`
- `scripts/check-v2-commerce.mjs`
