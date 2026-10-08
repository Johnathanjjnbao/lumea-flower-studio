# Technology Stack

## Runtime summary

| Area | Value | Evidence |
|---|---|---|
| Primary language | TypeScript/TSX, SQL, JavaScript QA scripts | `tsconfig.app.json`, `supabase/migrations/`, `scripts/` |
| Runtime | Node.js 22 in CI; browser client | `.github/workflows/deploy.yml`, `src/main.tsx` |
| Package manager | npm | `package-lock.json` |
| Build system | Vite 7 + TypeScript project build | `package.json`, `vite.config.ts` |

## Production dependencies

| Dependency | Version | Role | Evidence |
|---|---:|---|---|
| React / React DOM | 19.1.1 | UI runtime | `package.json` |
| React Router DOM | 7.18.4 | localized storefront/Admin routing | `package.json`, `src/App.tsx` |
| Supabase JS | 2.117.2 | Postgres, Auth, Storage, Edge Function client | `package.json`, `src/lib/supabase.ts` |
| GSAP | 3.13.0 | controlled motion | `package.json`, `src/hooks/useImagePipeline.ts` |

## Development toolchain and commands

| Tool | Purpose | Evidence |
|---|---|---|
| TypeScript 5.9 | static type checking | `package.json`, `tsconfig.app.json` |
| Vite 7 | dev server and production build | `package.json`, `vite.config.ts` |
| Supabase CLI 2.120.0 | local migrations and SQL tests in CI | `.github/workflows/deploy.yml` |
| Playwright for Python | browser smoke/flow QA | `requirements-qa.txt`, `scripts/check-browser-smoke.py` |

```bash
npm ci
npm run typecheck
npm run check:ci
npm run check:v2-commerce
npm run build
```

## Environment and config

- Public browser config: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY` from `.env.example`.
- Edge Function secrets are server-side and documented in `supabase/.env.example`; never prefix secrets with `VITE_`.
- GitHub Pages base path is `/lumea-flower-studio/` in `vite.config.ts`.
- TODO: add an `engines.node` field if local Node version enforcement becomes necessary.

## Evidence

- `package.json`
- `package-lock.json`
- `.github/workflows/deploy.yml`
- `vite.config.ts`
- `.env.example`
