# Loomis — Roles, Consoles & Demo Logins

All **17 roles** in the system, which app they use, where they land after login, and demo credentials where seeds exist.

---

## Dev email convention

School staff logins use **`{role}@{schoolSlug}.loomis.com`** — the slug is a short name for the school (not a separate product tier):

| School (seed) | Slug | Example principal login | Tier |
|---------------|------|-------------------------|------|
| Greenfield Academy Lagos | `greenfield` | `principal@greenfield.loomis.com` | Core |
| Advanced QA School Lagos | `advanced` | `principal@advanced.loomis.com` | Advanced |

Platform / regional (no tenant): **`{role}@platform.loomis.com`** (e.g. `owner@platform.loomis.com`).

In production, onboarding picks the slug when the school is created (e.g. Lugard College → `lugard` → `principal@lugard.loomis.com`). Same **role** (`principal`), different **school domain**.

**After changing seed emails:** drop DB and re-run `pnpm db:seed`, or old `@demo.loomis.com` / flat `@loomis.com` users will not match.

---

## Quick setup (local dev)

```bash
pnpm db:up
pnpm --filter @loomis/api db:migrate
pnpm db:seed          # platform + regional + Advanced QA + Greenfield Academy
pnpm dev
```

| Item | Value |
|------|--------|
| **Web login** | http://localhost:3000/login |
| **Password (all seeded accounts)** | `LoomisDev2026!` |
| **MFA secret (base32)** | `JBSWY3DPEHPK3PXP` — add to authenticator as “Loomis Dev” |

School staff accounts log in with **password only** (no MFA at login). Platform and regional roles require **password + TOTP** when seeded.

After `pnpm db:seed`, the console prints the **Tenant ID** for Greenfield Academy and the **student portal email** (opaque format) — school logins need tenant context (handled automatically on web after login).

Re-running `pnpm db:seed` is **idempotent** — missing role accounts are added without wiping existing data. To re-seed Greenfield only: `pnpm db:seed:rich`.

---

## Console map

| Console | URL prefix | Roles |
|---------|------------|--------|
| **Platform** | `/platform/*` | `platform_owner`, `platform_admin`, `dpo` |
| **Regional** | `/regional/*` | `regional_manager`, `regional_subordinate` |
| **School** | `/school/*` | All 10 school staff roles |
| **Parent / Student (web)** | `/parent/*` | `parent`, `student` |
| **Mobile app** | Expo stacks | `parent`, `student`, `teacher`, `class_teacher` only |

**Public (no login):** `/` (marketing), `/login`, `/mfa`, `/reset-password`, `/payments/complete`

---

## All roles — login, console & landing

### Platform console (`/platform`)

| Role | Login email | Password | MFA | Default landing | Notes |
|------|-------------|----------|-----|-----------------|-------|
| **platform_owner** | `owner@platform.loomis.com` | `LoomisDev2026!` | Yes | `/platform` | From `pnpm db:seed` |
| **platform_admin** | `admin@platform.loomis.com` | `LoomisDev2026!` | Yes | `/platform` | From `pnpm db:seed` |
| **dpo** | `dpo@platform.loomis.com` | `LoomisDev2026!` | Yes | `/platform/compliance` | Compliance-only nav |

---

### Regional console (`/regional`)

| Role | Login email | Password | MFA | Default landing |
|------|-------------|----------|-----|-----------------|
| **regional_manager** | `regional.manager@platform.loomis.com` | `LoomisDev2026!` | Yes | `/regional` |
| **regional_subordinate** | `regional.sub@platform.loomis.com` | `LoomisDev2026!` | Yes | `/regional` |

---

### School console — Greenfield Academy (`pnpm db:seed`, `@greenfield.loomis.com`, Core tier)

| Role | Login email | Password | MFA | Default landing |
|------|-------------|----------|-----|-----------------|
| **school_owner** | `owner@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school` |
| **principal** | `principal@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school` |
| **admin_officer** | `admin@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school` |
| **accountant** | `accountant@greenfield.loomis.com` | `LoomisDev2026!` | No | Finance desk |
| **cashier** | `cashier@greenfield.loomis.com` | `LoomisDev2026!` | No | Finance desk |
| **exam_officer** | `exam@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school/exams` |
| **deputy_exam_officer** | `deputy@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school/exams` |
| **timetable_officer** | `timetable@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school/timetable` |
| **teacher** | `teacher01@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school/timetable` |
| **class_teacher** | `teacher03@greenfield.loomis.com` | `LoomisDev2026!` | No | `/school/dashboard` |

Also `teacher02`–`teacher13@greenfield.loomis.com` for other class arms.

---

### School console — Advanced QA (`pnpm db:seed`, `@advanced.loomis.com`, Advanced tier)

| Role | Login email | Password |
|------|-------------|----------|
| **school_owner** | `owner@advanced.loomis.com` | `LoomisDev2026!` |
| **principal** | `principal@advanced.loomis.com` | `LoomisDev2026!` |

---

### Parent / student (`@greenfield.loomis.com`)

| Role | Login email | Password |
|------|-------------|----------|
| **parent** | `parent.jss3b@greenfield.loomis.com` | `LoomisDev2026!` |
| **student** | *Printed by `pnpm db:seed`* | `LoomisDev2026!` |

---

### Mobile app (Expo)

Requires `pnpm db:seed`. Password: `LoomisDev2026!` for all below.

| Role | Login email |
|------|-------------|
| **parent** | `parent.jss3b@greenfield.loomis.com` |
| **student** | *Greenfield student portal email (seed output)* |
| **teacher** | `teacher01@greenfield.loomis.com` |
| **class_teacher** | `teacher03@greenfield.loomis.com` |

---

## MFA reference (platform & regional login)

1. Email + password `LoomisDev2026!`
2. MFA screen → 6-digit code from authenticator  
   - **Secret:** `JBSWY3DPEHPK3PXP` (base32)

---

## One-line cheat sheet

```
owner@platform.loomis.com              platform_owner      MFA
admin@platform.loomis.com              platform_admin      MFA
dpo@platform.loomis.com                dpo                 MFA

principal@greenfield.loomis.com      principal (Greenfield — main demo)
principal@advanced.loomis.com        principal (Advanced QA school)

Password for all: LoomisDev2026!
```
