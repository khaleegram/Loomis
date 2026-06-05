# Loomis

Multi-tenant SaaS school management platform for Nigerian private schools.
Revenue model: **Per-Student Fee (PSF)** — charged once per billable student per academic term, triggered by enrollment census lock (not by payment).

## Documentation

| Document | Purpose |
|----------|---------|
| `Loomis_SRS_v3.md` | Software Requirements Specification |
| `Loomis_System_Design_v1.md` | Backend / infrastructure system design |
| `Loomis_Frontend_Architecture_v1.md` | Web + mobile frontend architecture |
| `Loomis_Revenue_Integrity_Architecture_FINAL.md` | Revenue integrity & fraud countermeasures |
| `Loomis_User_Stories_v1.md` | User stories across all modules |
| `Loomis_Adversarial_Analysis.md` | Threat / vulnerability analysis |

AI implementation guidance lives in `.cursor/rules/`.

## Monorepo Layout

```
apps/
  api/         Fastify backend (Node 22 + TypeScript)
  web/         Next.js 15 web app
  mobile/      Expo React Native app
packages/
  contracts/   Shared Zod schemas + inferred types (API contract)
  api-client/  Typed HTTP client + TanStack Query hooks (web + mobile)
  core/        Pure domain logic (capabilities, money, dates) — no UI, no I/O
  ui-web/      Web design system (Shadcn/UI + Tailwind)
  ui-mobile/   Mobile design system (NativeWind)
  design-tokens/ Shared colors / spacing / typography
  config/      Shared TS / ESLint / Prettier configs
drizzle/       Database migrations + Drizzle schema
```

## Tech Stack

- **Backend:** Node 22, Fastify 5, TypeScript, Drizzle ORM, PostgreSQL 16, Redis 7, BullMQ
- **Web:** Next.js 15 (App Router), TanStack Query, Zustand, Tailwind, Shadcn/UI
- **Mobile:** Expo (React Native), Expo Router, SQLite (offline-first), NativeWind
- **Shared:** Zod contracts, TanStack Query, pnpm + Turborepo

## Local Development

Prerequisites: Node 22 (`nvm use`), pnpm 9, Docker.

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres + Redis + Mailpit
pnpm db:up

# 3. Copy env and fill values
cp .env.example .env.local

# 4. Run database migrations (once apps/api is set up)
pnpm --filter @loomis/api db:migrate

# 5. Start everything in dev
pnpm dev
```

## Build Phases

1. **Phase 1 — Foundation:** Identity → Tenant → HRM → Academic Session → Student
2. **Phase 2 — Operations:** Academic (grades, attendance, timetable), Finance
3. **Phase 3 — Revenue Integrity:** PSF pipeline, Ledger, IVP, Attestation
4. **Phase 4 — Ecosystem:** Referral, Parent Portal, Mobile, Comms
5. **Phase 5 — Compliance:** DSAR, Breach, Retention, NDPA workflows

Do not start a phase before the previous one is complete and tested.
