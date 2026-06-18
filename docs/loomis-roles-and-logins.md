# Loomis — Roles, Consoles & Demo Logins

All **17 roles** in the system, which app they use, where they land after login, and demo credentials where seeds exist.

---

## Quick setup (local dev)

```bash
pnpm db:up
pnpm --filter @loomis/api db:migrate
pnpm db:seed          # platform + small demo school (@demo.loomis.local)
pnpm db:seed:rich     # Greenfield Academy Lagos (@loomis.com) — recommended for UI demos
pnpm dev
```

| Item | Value |
|------|--------|
| **Web login** | http://localhost:3000/login |
| **Password (all seeded accounts)** | `LoomisDev2026!` |
| **MFA secret (base32)** | `JBSWY3DPEHPK3PXP` — add to authenticator as “Loomis Dev” |

School staff accounts log in with **password only** (no MFA at login). Platform and regional roles require **password + TOTP** when seeded.

After `pnpm db:seed:rich`, the console prints the **Tenant ID** for Greenfield Academy — school logins need that tenant context (handled automatically on web after login).

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
| **platform_owner** | `owner@demo.loomis.local` | `LoomisDev2026!` | Yes | `/platform` | From `pnpm db:seed`. Tenants, PSF, ledger, approvals, risk, referrals + compliance nav |
| **platform_admin** | `admin@demo.loomis.local` | `LoomisDev2026!` | Yes | `/platform` | From `pnpm db:seed`. Same ops console as owner |
| **dpo** | `dpo@demo.loomis.local` | `LoomisDev2026!` | Yes | `/platform/compliance` | From `pnpm db:seed`. Compliance-only nav (DSAR, breaches, retention, audit) |

---

### Regional console (`/regional`)

| Role | Login email | Password | MFA | Default landing | Notes |
|------|-------------|----------|-----|-----------------|-------|
| **regional_manager** | *Not seeded* | — | Yes (when created) | `/regional` | Onboard schools, subordinates, referral earnings. Create via platform provisioning / referral module |
| **regional_subordinate** | *Not seeded* | — | Yes (when created) | `/regional` | Onboard schools, referral earnings (no subordinates nav) |

---

### School console (`/school`) — Greenfield Academy (`pnpm db:seed:rich`)

| Role | Login email | Password | MFA | Default landing | Seeded? |
|------|-------------|----------|-----|-----------------|---------|
| **school_owner** | *Not seeded* | — | No | `/school` | Invite via **Staff → Add** as school owner, or assign role in HRM |
| **principal** | `principal@loomis.com` | `LoomisDev2026!` | No | `/school` | Yes — full school ops |
| **admin_officer** | `admin@loomis.com` | `LoomisDev2026!` | No | `/school` | Yes — admissions, students, staff onboarding, comms |
| **accountant** | *Not seeded* | — | No | `/school` | Invite staff with primary role **Accountant** (singleton) |
| **cashier** | *Not seeded* | — | No | `/school` | Invite staff with primary role **Cashier** |
| **exam_officer** | `exam@loomis.com` | `LoomisDev2026!` | No | `/school` | Yes — focused: exams, gradebook, report cards |
| **deputy_exam_officer** | *Not seeded* | — | No | `/school` | Assign deputy exam officer extension in HRM; active only after exam officer 72h inactive |
| **timetable_officer** | `timetable@loomis.com` | `LoomisDev2026!` | No | `/school/timetable` | Yes — timetable builder |
| **teacher** | `teacher01@loomis.com` | `LoomisDev2026!` | No | `/school/timetable` | Yes — subject teacher only (My Schedule, assignments, gradebook) |
| **class_teacher** | `teacher03@loomis.com` | `LoomisDev2026!` | No | `/school/dashboard` | Yes — **JSS1 B** class teacher (attendance, comms). Also `teacher02`–`teacher13@loomis.com` for other arms |

#### School console — small demo school (`pnpm db:seed` only, `@demo.loomis.local`)

| Role | Login email | Password |
|------|-------------|----------|
| **principal** | `principal@demo.loomis.local` | `LoomisDev2026!` |
| **exam_officer** | `exam@demo.loomis.local` | `LoomisDev2026!` |
| **teacher** | `teacher@demo.loomis.local` | `LoomisDev2026!` |
| **class_teacher** | `classteacher@demo.loomis.local` | `LoomisDev2026!` |

Use **either** the rich seed (`@loomis.com`) **or** the small demo (`@demo.loomis.local`) — not both for the same role name on one machine unless both tenants exist.

---

### Parent / student console (`/parent` — web)

| Role | Login email | Password | MFA | Default landing | Seeded? |
|------|-------------|----------|-----|-----------------|---------|
| **parent** | `parent.jss3b@loomis.com` | `LoomisDev2026!` | No | `/parent` | Yes (rich seed) — child in **JSS3 B**; fees, attendance, results, inbox |
| **student** | *Not seeded* | — | No | `/parent` | No student portal login in rich seed yet — shares `/parent/*` routes on web when provisioned |

**Parent web pages:** Dashboard, Timetable, Attendance, Results, Inbox, Fees, Settings

**Student web pages (when provisioned):** Dashboard, Timetable, Results, Inbox, Assignments, Attendance

---

### Mobile app (Expo)

Requires `pnpm db:seed:rich`. Password: `LoomisDev2026!` for all below.

| Role | Login email | App home | Seeded? |
|------|-------------|----------|---------|
| **parent** | `parent.jss3b@loomis.com` | `/(parent)/(tabs)` | Yes |
| **student** | *Not seeded* | `/(student)/(tabs)` | No |
| **teacher** | `teacher01@loomis.com` | `/(teacher)/(tabs)` | Yes |
| **class_teacher** | `teacher03@loomis.com` | `/(class-teacher)/(tabs)` | Yes |

All other roles signing into mobile see **“Use the web console”** (`/(auth)/unsupported`).

---

## School nav by role (capability-filtered)

Same `/school/*` shell; sidebar items depend on role.

| Role | Typical nav |
|------|-------------|
| **school_owner** | Dashboard, Staff, Students, Academic, Timetable, Finance, PSF, Workflows, Comms, Settings |
| **principal** | Full ops + Exams, Gradebook, Report cards, Attendance, Assignments |
| **admin_officer** | Dashboard, Staff, Students, Academic, Timetable, Workflows, Comms, Settings |
| **accountant** | Dashboard, Finance, PSF, Workflows (refunds), Settings |
| **cashier** | Dashboard, Finance (log payments), Workflows (refund initiate), Settings |
| **exam_officer** / **deputy_exam_officer** | Exams, Gradebook, Report cards, Settings (no dashboard) |
| **timetable_officer** | Timetable, Settings (no dashboard) |
| **teacher** | Timetable (My Schedule), Assignments, Gradebook, Settings |
| **class_teacher** | Dashboard (My Class), Timetable, Assignments, Gradebook, Attendance, Comms, Settings |

---

## Roles without demo logins — how to test

| Role | How to get a login |
|------|---------------------|
| **school_owner** | Platform provisions tenant with owner email, or promote staff in HRM |
| **accountant** / **cashier** | School → Staff → Invite / Add with that primary role |
| **deputy_exam_officer** | HRM → assign deputy exam officer extension to existing staff |
| **regional_manager** / **regional_subordinate** | Platform referral / regional onboarding (not in `db:seed`) |
| **student** | Student account provisioning (identity module) — not in rich seed yet |

---

## MFA reference (platform login)

When logging in as `owner@`, `admin@`, or `dpo@demo.loomis.local`:

1. Email + password `LoomisDev2026!`
2. MFA screen → 6-digit code from authenticator  
   - **Secret:** `JBSWY3DPEHPK3PXP` (base32)  
   - Or run seed again — it prints a fresh current TOTP in the terminal

---

## One-line cheat sheet (rich seed)

```
owner@demo.loomis.local          platform_owner      MFA
admin@demo.loomis.local          platform_admin      MFA
dpo@demo.loomis.local            dpo                 MFA
principal@loomis.com             principal
admin@loomis.com                 admin_officer
exam@loomis.com                  exam_officer
timetable@loomis.com             timetable_officer
teacher01@loomis.com             teacher
teacher03@loomis.com             class_teacher
parent.jss3b@loomis.com         parent

Password for all: LoomisDev2026!
```
