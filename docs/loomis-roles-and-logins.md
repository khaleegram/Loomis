# Loomis — Roles, Consoles & Demo Logins

All **17 roles** in the system, which app they use, where they land after login, and demo credentials where seeds exist.

**Last updated:** Sprint 7 (Core audit, experience settings, admissions auto-register).

---

## Dev email convention

School staff logins use **`{roleLocal}@{schoolSlug}.loomis.com`** — the slug is the school identifier (not the experience tier):

| School (seed) | Slug | Example login | Experience tier |
|---------------|------|---------------|-----------------|
| Greenfield Academy Lagos | `greenfield` | `principal@greenfield.loomis.com` | **Core** |
| Advanced QA School Lagos | `advanced` | `principal@advanced.loomis.com` | **Advanced** |

Platform / regional (no tenant): **`{local}@platform.loomis.com`** (e.g. `owner@platform.loomis.com`).

In production, onboarding picks the slug when the school is created (e.g. Lugard College → `lugard` → `principal@lugard.loomis.com`).

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
| **Platform / regional MFA (TOTP)** | Secret `JBSWY3DPEHPK3PXP` (base32) — add to authenticator as “Loomis Dev” |
| **Core school SMS (dev bypass)** | `000000` when `TERMII_API_KEY` is **not** set (default local) |

After `pnpm db:seed`, the console prints the **Greenfield Tenant ID** and the **student portal email** (opaque format).

Re-running `pnpm db:seed` is **idempotent** — missing role accounts are added without wiping existing data. To re-seed Greenfield only: `pnpm db:seed:rich`.

**Core QA checklist:** [`docs/CORE_QA_MATRIX.md`](./CORE_QA_MATRIX.md)

---

## Authentication by tier (what you see at login)

### Platform & regional — always TOTP

1. Email + password `LoomisDev2026!`
2. Authenticator code (secret `JBSWY3DPEHPK3PXP`)

### Greenfield (Core tier) — SMS hybrid

| Role group | First login / new browser | Return visit (same browser, ≤30 days) |
|------------|---------------------------|----------------------------------------|
| **Owner, Principal, Admin Officer, Accountant, Cashier** | Password → **SMS code** | Password only (trusted device) |
| **Teachers, Class teachers, Exam / Timetable officers** | Password only | Password only |
| **Parent** | Password → **SMS** on new device | Password only on trusted device |
| **Student** | Password only | Password only |

**Local dev SMS:** enter `000000` on the MFA screen (no Termii keys required).

Optional: set `TERMII_API_KEY` + `TERMII_SENDER_ID` in `apps/api/.env.local` for real SMS delivery.

**Clear trusted device:** log out all devices, clear site data / use a private window, or deregister the device under **Settings → Security**.

### Advanced QA school — TOTP for step-up; password at login

Advanced tier school staff log in with **password only** (no Core SMS login). High-risk actions (census lock, large refunds, data export) still use **authenticator step-up** when configured.

---

## Admissions — who adds students?

Students enter via **apply → approve → enroll**, not a direct “add to registry” button.

**Core default:** Admin Officer registers a student in **one step** — submit the form and the student record is created immediately (no separate Approve click).

**Optional:** School Owner can enable **Require Principal or Owner approval** under **Settings → Experience**. When on, applications stay **pending** until leadership approves.

| Task | Role (default) | Login | Where |
|------|----------------|-------|--------|
| **Register student (one step)** | Admin Officer | `admin@greenfield.loomis.com` | **Admissions** → New Application / Register student |
| **Approve pending** (toggle on) | Principal or Owner | `principal@greenfield.loomis.com` | **Admissions** pipeline |
| **Toggle policy** | School Owner | `owner@greenfield.loomis.com` | **Settings → Experience** |
| **View enrolled students** | Admin, Principal, Owner | any of above | **Students → Registry** |

Principal **cannot** submit new applications — by design (US-SIS-001). They may approve when the school enables leadership sign-off (US-SIS-002).

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

## All roles — login, MFA & landing

### Platform console (`/platform`)

| Role | Login email | Password | Login MFA | Default landing |
|------|-------------|----------|-----------|-----------------|
| **platform_owner** | `owner@platform.loomis.com` | `LoomisDev2026!` | TOTP | `/platform` |
| **platform_admin** | `admin@platform.loomis.com` | `LoomisDev2026!` | TOTP | `/platform` |
| **dpo** | `dpo@platform.loomis.com` | `LoomisDev2026!` | TOTP | `/platform/compliance` |

---

### Regional console (`/regional`)

| Role | Login email | Password | Login MFA | Default landing |
|------|-------------|----------|-----------|-----------------|
| **regional_manager** | `regional.manager@platform.loomis.com` | `LoomisDev2026!` | TOTP | `/regional` |
| **regional_subordinate** | `regional.sub@platform.loomis.com` | `LoomisDev2026!` | TOTP | `/regional` |

---

### School console — Greenfield Academy (Core)

Password for all: **`LoomisDev2026!`**

| Role | Login email | Seeded phone | Login MFA (Core) | Default landing | Primary demo use |
|------|-------------|--------------|------------------|-----------------|------------------|
| **school_owner** | `owner@greenfield.loomis.com` | +2348011000005 | SMS → `000000` | `/school/dashboard` | Census lock, Experience settings, audit |
| **principal** | `principal@greenfield.loomis.com` | +2348011000001 | SMS → `000000` | `/school/dashboard` | Operations home; admit if toggle on |
| **admin_officer** | `admin@greenfield.loomis.com` | +2348011000004 | SMS → `000000` | `/school/dashboard` | **Register students (one step)**, registry |
| **accountant** | `accountant@greenfield.loomis.com` | +2348011000006 | SMS → `000000` | Finance desk | Verify payments |
| **cashier** | `cashier@greenfield.loomis.com` | +2348011000007 | SMS → `000000` | Finance desk | Log payments |
| **exam_officer** | `exam@greenfield.loomis.com` | +2348011000002 | Password only | `/school/exams` | Exams & publish |
| **deputy_exam_officer** | `deputy@greenfield.loomis.com` | +2348011000008 | Password only | `/school/exams` | Deputy exams |
| **timetable_officer** | `timetable@greenfield.loomis.com` | +2348011000003 | Password only | `/school/timetable` | Timetable builder |
| **teacher** | `teacher01@greenfield.loomis.com` | +2348011000101 | Password only | `/school/timetable` | Subject teacher / schedule |
| **class_teacher** | `teacher03@greenfield.loomis.com` | +2348011000103 | Password only | `/school/dashboard` | JSS1 B — attendance |

Also `teacher02`–`teacher13@greenfield.loomis.com` (class teachers on other arms).

---

### School console — Advanced QA (Advanced tier)

| Role | Login email | Password | Login MFA | Notes |
|------|-------------|----------|-----------|--------|
| **school_owner** | `owner@advanced.loomis.com` | `LoomisDev2026!` | Password only | Workflows inbox enabled |
| **principal** | `principal@advanced.loomis.com` | `LoomisDev2026!` | Password only | Advanced flags in seed |

---

### Parent / student (Greenfield)

| Role | Login email | Password | Login MFA | Notes |
|------|-------------|----------|-----------|--------|
| **parent** | `parent.jss3b@greenfield.loomis.com` | `LoomisDev2026!` | SMS on **new device** → `000000` | Linked child JSS3 B; SMS before **Pay fees** online |
| **student** | *Printed by `pnpm db:seed`* | `LoomisDev2026!` | Password only | Opaque portal email in seed output |

Parent seeded phone: `+2348015550196`

---

### Mobile app (Expo)

Password: **`LoomisDev2026!`** for all below.

| Role | Login email | MFA notes |
|------|-------------|-----------|
| **parent** | `parent.jss3b@greenfield.loomis.com` | SMS on new device; SMS before fee payment |
| **student** | *Greenfield student portal email (seed output)* | Password only |
| **teacher** | `teacher01@greenfield.loomis.com` | Password only |
| **class_teacher** | `teacher03@greenfield.loomis.com` | Password only |

---

## Step-up MFA (after login)

Separate from login MFA — required before specific actions:

| Action | Core tier | Dev code |
|--------|-----------|----------|
| Census lock (Owner) | SMS | `000000` |
| Refund approve ≥ ₦100,000 | SMS | `000000` |
| Refund approve &lt; ₦100,000 (Core) | None | — |
| Parent online fee payment | SMS | `000000` |
| Platform data export / PSF rate change | TOTP | Authenticator |

Policy summary also appears under **School → Settings → Security** (Core tenants).

---

## MFA reference (platform & regional)

1. Email + password `LoomisDev2026!`
2. MFA screen → 6-digit **authenticator** code  
   - **Secret:** `JBSWY3DPEHPK3PXP` (base32)

---

## One-line cheat sheet

```
# Platform (TOTP after password)
owner@platform.loomis.com                 platform_owner
admin@platform.loomis.com                 platform_admin
dpo@platform.loomis.com                   dpo
regional.manager@platform.loomis.com      regional_manager

# Greenfield Core — admissions workflow (default: admin decides)
admin@greenfield.loomis.com               admin_officer   ← register + approve
principal@greenfield.loomis.com           principal       ← approve if Owner toggled policy on
owner@greenfield.loomis.com               school_owner    ← Settings → Experience toggle

# Greenfield — other common demos
accountant@greenfield.loomis.com          finance verify
teacher03@greenfield.loomis.com           class teacher / attendance
parent.jss3b@greenfield.loomis.com        parent portal / fees

# Advanced QA
principal@advanced.loomis.com             principal (Advanced tier)

Password (all):  LoomisDev2026!
TOTP secret:     JBSWY3DPEHPK3PXP   (platform / regional / Advanced step-up)
Core SMS (dev):  000000             (Greenfield leadership + finance + parent)
```
