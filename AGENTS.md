# MaqJeez Development Guide

## Overview

MaqJeez is a multi-tenant SaaS platform for machine repair workshops in Argentina, integrated with Mercado Libre. The codebase is a monorepo with 3 independent Next.js 14 apps under `apps/`:

| App | Directory | Port | Description |
|-----|-----------|------|-------------|
| MeLi | `apps/meli` | 3000 | Mercado Libre management dashboard |
| Taller Demo | `apps/taller-demo` | 3001 | Workshop management demo |
| Landing | `apps/landing` | 3000 | Marketing landing (scaffolded, no src/) |

Each app has its own `package.json` and `package-lock.json`. There is no root workspace — install deps independently per app with `npm install`.

## Cursor Cloud specific instructions

### Environment Variables

Both meli and taller-demo apps require `.env.local` files with Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://ajhmajaclimccrkehsyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<real key from secrets>
SUPABASE_SERVICE_ROLE_KEY=<real key from secrets>
```

The meli app additionally requires:
```
NEXT_PUBLIC_MELI_APP_ID=<from secrets>
APPJEEZ_MELI_SECRET_KEY=<from secrets>
APPJEEZ_MELI_ENCRYPTION_KEY=<32+ char AES key from secrets>
```

Without real Supabase keys, the apps start in dev mode but API routes that create server-side Supabase clients will error. The login pages and UI render correctly regardless.

### Running Dev Servers

```bash
cd apps/meli && npm run dev        # http://localhost:3000
cd apps/taller-demo && npm run dev # http://localhost:3001
```

### Lint

ESLint is only configured for the meli app. The root `.eslintrc.json` extends `next/core-web-vitals` but the package is installed under `apps/meli/node_modules`. You must set `NODE_PATH` when running lint:

```bash
cd apps/meli && NODE_PATH=$(pwd)/node_modules npx next lint
```

### Build

- `apps/taller-demo`: Builds successfully with placeholder env vars.
- `apps/meli`: The production build (`npm run build`) fails without real `SUPABASE_SERVICE_ROLE_KEY` because certain API routes instantiate Supabase clients at module scope during static page collection. Dev mode (`npm run dev`) works fine with placeholder credentials.

### Key Gotchas

- No root `package.json` or npm workspaces — each app is independent.
- The `apps/landing` directory is an empty scaffold (no `src/` directory).
- The Supabase project ID is `ajhmajaclimccrkehsyy` (defined in `/workspace/supabase.yaml`).
- `local-print-agent/` is a Windows-only thermal printer utility — not relevant for cloud dev.
