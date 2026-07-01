# Loomis — Roles, Consoles & Demo Logins

All **17 roles** in the system, which app they use, where they land after login, and demo credentials where seeds exist.

**Last updated:** Audit closure (Phases A–D) — June 2026.

**Coverage matrix:** [`ROLE_EXPERIENCE_COVERAGE_MATRIX.md`](./ROLE_EXPERIENCE_COVERAGE_MATRIX.md)

**QA matrices:** [Core](./CORE_QA_MATRIX.md) · [Advanced / Enterprise](./ADVANCED_QA_MATRIX.md) · [Pilot checklist](./PILOT_CHECKLIST.md)

---

## Dev email convention

School staff logins use **`{roleLocal}@{schoolSlug}.loomis.com`** — the slug is the school identifier (not the experience tier):

| School (seed) | Slug | Example login | Experience tier |
|---------------|------|---------------|-----------------|
| Greenfield Academy Lagos | `greenfield` | `principal@greenfield.loomis.com` | **Core** |
| Advanced QA School Lagos | `advanced` | `principal@advanced.loomis.com` | **Advanced** |
| Enterprise QA School Lagos | `enterprise` | `principal@enterprise.loomis.com` | **Enterprise** |

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
| **Core step-up SMS (dev bypass)** | `000000` when `TERMII_API_KEY` is **not** set (refunds ≥ ₦100k, etc.) |

After `pnpm db:seed`, the console prints the **Greenfield Tenant ID** and the **student portal email** (opaque format).

Re-running `pnpm db:seed` is **idempotent** — missing role accounts are added without wiping existing data. To re-seed Greenfield only: `pnpm db:seed:rich`.

**Core QA checklist:** [`docs/CORE_QA_MATRIX.md`](./CORE_QA_MATRIX.md)

---

## Authentication (what you see at login)

### Platform & regional — TOTP required

1. Email + password `LoomisDev2026!`
2. Authenticator code (secret `JBSWY3DPEHPK3PXP`)

### School, parent & student — password only

All tenant-scoped roles (school staff, parents, students) sign in with **email + password only**. No SMS or authenticator step at login.

High-risk actions after login (census lock, large refunds, platform console changes) may still require **step-up** verification — see below.

**Local dev step-up SMS:** enter `000000` on the verification screen when `TERMII_API_KEY` is unset.

Optional: set `TERMII_API_KEY` + `TERMII_SENDER_ID` in `apps/api/.env.local` for real SMS on step-up actions.

### Advanced / Enterprise schools — step-up after login

Advanced tier school staff log in with **password only**. High-risk actions (census lock, large refunds, data export) use **SMS or authenticator step-up** when configured.

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

| Role | Login email | Seeded phone | Login | Default landing | Primary demo use |
|------|-------------|--------------|-------|-----------------|------------------|
| **school_owner** | `owner@greenfield.loomis.com` | +2348011000005 | Password only | `/school/dashboard` | Census lock, Experience settings, audit export (Advanced+) |
| **principal** | `principal@greenfield.loomis.com` | +2348011000001 | Password only | `/school/dashboard` | Operations home; **census lock**; timetable builder via **Academic → Timetable** |
| **admin_officer** | `admin@greenfield.loomis.com` | +2348011000004 | Password only | `/school/dashboard` | **Register students (one step)**, registry |
| **accountant** | `accountant@greenfield.loomis.com` | +2348011000006 | Password only | Finance desk | Verify payments |
| **cashier** | `cashier@greenfield.loomis.com` | +2348011000007 | Password only | Finance desk | Log payments |
| **exam_officer** | `exam@greenfield.loomis.com` | +2348011000002 | Password only | `/school/exams` | Exams & publish |
| **teacher** | `teacher01@greenfield.loomis.com` | +2348011000101 | Password only | `/school/dashboard` | Teacher Desk (My Schedule, gradebook, assignments) |
| **class_teacher** | `teacher03@greenfield.loomis.com` | +2348011000103 | Password only | `/school/dashboard` | JSS1 B — attendance |

Core does **not** seed Timetable Officer or Deputy Exam Officer — use the **Advanced QA** tenant below for those roles.

Also `teacher02`–`teacher13@greenfield.loomis.com` (class teachers on other arms).

---

### School console — Advanced QA (Advanced tier)

| Role | Login email | Password | Login MFA | Notes |
|------|-------------|----------|-----------|--------|
| **school_owner** | `owner@advanced.loomis.com` | `LoomisDev2026!` | Password only | Enable Advanced / split finance in **Settings → Experience** |
| **principal** | `principal@advanced.loomis.com` | `LoomisDev2026!` | Password only | Advanced flags in seed |
| **cashier** | `cashier@advanced.loomis.com` | `LoomisDev2026!` | Password only | Split finance — home `/school/finance/payments/log` |
| **accountant** | `accountant@advanced.loomis.com` | `LoomisDev2026!` | Password only | Split finance — home `/school/finance/payments/verify` |
| **exam_officer** | `exam@advanced.loomis.com` | `LoomisDev2026!` | Password only | `/school/exams?section=corrections` |
| **deputy_exam_officer** | `deputy-exam@advanced.loomis.com` | `LoomisDev2026!` | Password only | Deputy — active after Exam Officer 72h inactive |
| **timetable_officer** | `timetable@advanced.loomis.com` | `LoomisDev2026!` | Password only | `/school/timetable` (requires dedicated officer flag) |

Seed sets `finance_mode=split` on the Advanced QA tenant. Re-run `pnpm db:seed` if these accounts are missing.

---

### School console — Enterprise QA (Enterprise tier)

Platform must set `experienceTier=enterprise` (Platform → Tenants → Experience card).

| Role | Login email | Password | Login | Notes |
|------|-------------|----------|-------|--------|
| **school_owner** | `owner@enterprise.loomis.com` | `LoomisDev2026!` | Password only | Attestations nav; TOTP step-up on high-risk actions |
| **principal** | `principal@enterprise.loomis.com` | `LoomisDev2026!` | Password only | **Attestations** nav; census lock; emergency publish after 120h EO idle only |
| **exam_officer** | `exam@enterprise.loomis.com` | `LoomisDev2026!` | Password only | Normal publish path |

Enterprise adds **Attestations** (`/school/academic/attestations`) for **Owner and Principal** and **SoD notices** on verify, refunds, and role change flows.

---

### Parent / student (Greenfield)

| Role | Login email | Password | Login | Notes |
|------|-------------|----------|-------|--------|
| **parent** | `parent.jss3b@greenfield.loomis.com` | `LoomisDev2026!` | Password only | Linked child JSS3 B; fees; attendance |
| **student** | *Printed by `pnpm db:seed`* | `LoomisDev2026!` | Password only | Opaque portal email in seed output |

Parent seeded phone: `+2348015550196`

---

### Mobile app (Expo)

Password: **`LoomisDev2026!`** for all below.

| Role | Login email | Login |
|------|-------------|-------|
| **parent** | `parent.jss3b@greenfield.loomis.com` | Password only |
| **student** | *Greenfield student portal email (seed output)* | Password only |
| **teacher** | `teacher01@greenfield.loomis.com` | Password only |
| **class_teacher** | `teacher03@greenfield.loomis.com` | Password only |

---

## Step-up MFA (after login)

Separate from login MFA — required before specific actions:

| Action | Core tier | Dev code |
|--------|-----------|----------|
| Census lock (Owner **or Principal**) | SMS | `000000` |
| Refund approve ≥ ₦100,000 | SMS | `000000` |
| Refund approve &lt; ₦100,000 (Core) | None | — |
| Refund approve (Enterprise) | TOTP | Authenticator |
| Result publish (Enterprise Principal emergency) | TOTP | Authenticator |
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

# Enterprise QA (platform activates tier)
owner@enterprise.loomis.com               school_owner
principal@enterprise.loomis.com           principal (emergency publish after 120h EO idle)
exam@enterprise.loomis.com                exam_officer

Password (all):  LoomisDev2026!
TOTP secret:     JBSWY3DPEHPK3PXP   (platform / regional login + step-up)
Step-up SMS:     000000             (Core refunds ≥ ₦100k when Termii unset)
```
