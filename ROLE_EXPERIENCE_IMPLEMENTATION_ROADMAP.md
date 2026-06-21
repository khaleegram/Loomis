# Loomis — Role Experience Implementation Roadmap

**Status:** Execution guide — merges `ROLE_EXPERIENCE_TIER_PLAN.md` + `ROLE_EXPERIENCE_MASTER_PLAN.md` v1.1 into ordered sprints.  
**Version:** 1.0  
**Date:** 21 June 2026  

**Rule:** Build **Core first** (Sprints 1–7). **Advanced** (8–12) and **Enterprise** (13–14) only behind `tenant.experienceTier` / feature flags. Backend integrity is never tier-gated.

**Git:** After each sprint’s exit criteria pass, commit on `main` as `feat(role-exp): Sprint N — <short theme>` (one commit per sprint). Pre–Sprint 1 work uses `feat(mobile):` / `docs:` prefixes. Push when the batch is ready for remote backup.

**Sprint size assumption:** ~1 week focused dev per sprint (adjust to team capacity). Do not start sprint N+1 until sprint N exit criteria pass.

---

## Sprint map (overview)

| Sprint | Theme | Tier | Outcome |
|--------|--------|------|---------|
| **1** | Tier spine | All | Config + hooks; Core default everywhere |
| **2** | Capabilities & API integrity | All | Presets, SoD, Owner gates on API |
| **3** | Core nav & finance UX | Core | Finance Officer, hidden enterprise nav |
| **4** | Core leadership home | Core | Attention badges, no Workflow module |
| **5** | Core approvals | Core | One-tap Owner actions, refund thresholds |
| **6** | Core MFA (SMS) | Core | Trusted device, census/refund OTP |
| **7** | Core audit & polish | Core | Simple audit, homes, docs, Core QA |
| **8** | Advanced settings & split finance | Advanced | Owner toggles, cashier/accountant split |
| **9** | Advanced nav & workflows | Advanced | Master plan §5.4, Workflow Inbox |
| **10** | Advanced dashboards | Advanced | Owner/Principal full dashboards |
| **11** | Advanced roles & chains | Advanced | Timetable Officer, Deputy Exam, multi-refund |
| **12** | Advanced auth & audit+ | Advanced | Optional TOTP, tenant audit, export |
| **13** | Enterprise platform | Enterprise | Attestations API/UI, emergency publish, TOTP mandate |
| **14** | Finish & regression | All | Hygiene, full test matrix, pilot sign-off |

---

## Sprint 1 — Tier spine

**Goal:** Every UI/API path can read tenant tier and finance mode.

### Deliverables

- [x] DB: `tenant.experience_tier` (`core` \| `advanced` \| `enterprise`), default `core`
- [x] DB: `tenant.finance_mode` (`combined` \| `split`), default `combined`
- [x] DB: feature flags JSON or columns (`workflows_inbox`, `timetable_dedicated_officer`, `deputy_exam_enabled`, `totp_optional`, etc.)
- [x] Contracts + tenant config API exposes tier/flags to web/mobile
- [x] `packages/core`: types for tier + `FinanceMode`
- [x] Web: `useTenantExperience()` hook (tier, financeMode, flags, `isCore` / `isAdvanced` / `isEnterprise`)
- [x] Seed: Rich school = `core`; second fixture tenant = `advanced` for QA
- [x] Migration on existing tenants → `core` + `combined`

### Key files (expected)

- `apps/api/drizzle/schema/tenant.ts`
- `packages/contracts/src/tenant/`
- `apps/web/src/lib/tenant/use-tenant-experience.ts`

### Exit criteria

- Hook returns `core` for default seed login
- No user-visible change yet — infrastructure only
- `pnpm --filter @loomis/api db:migrate` clean

---

## Sprint 2 — Capabilities & API integrity

**Goal:** Server matches tier plan SoD and v1.1 capability targets (enforcement layer).

### Deliverables

- [x] `capabilities.ts`: add `staff.role.request`, `staff.role.assign`, `finance.balances.view`; Owner `admissions.approve`; Accountant `ledger.view`; remove direct `staff.role.assign` finalize from Principal
- [x] **Finance combined preset** service: when `financeMode=combined`, effective caps for finance user = log + verify + initiate + configure + balances.view
- [x] **Split finance guard**: reject invite/assignment if same `userId` would hold cashier + accountant when `split`
- [x] **Combined mode SoD**: cashier≠verify same payment still enforced by `logged_by_id !== verifier_id` even when one person (allow only if product explicitly allows self-verify in combined — **default: block self-verify** per tier plan)
- [x] Outstanding balances API: `requireCapability('finance.balances.view')` (Owner, Principal, Accountant preset)
- [x] PSF list API: `ledger.view` capability check
- [x] Census lock API: **Owner role required** (Principal cannot lock in Core; align with tier plan §5 — note: if same person has both accounts, collapse)
- [x] Role change API: Principal may **request**; Owner **assign** only
- [x] Same-person collapse helper: `shouldCollapseApproval(actor, requiredApprovers)`

### Exit criteria

- API tests for SoD and Owner-only census
- Capabilities match master plan §2.2 when Advanced caps apply
- No nav/UI work required this sprint

---

## Sprint 3 — Core nav & finance UX

**Goal:** Core schools see simple finance; enterprise nav hidden.

### Deliverables

- [x] Rewrite `school-nav-config.ts` with **tier-aware** `isNavVisible(item, tier, flags)`
- [x] **Core hides:** Workflows nav, PSF top-level, Timetable Officer, Deputy Exam
- [x] **Core shows:** Finance Officer path (combined), Exam Officer, existing teaching roles
- [x] UI label **Finance Officer** when `financeMode=combined` (role label map)
- [x] Finance entry redirect: combined → single finance home (verify or unified finance desk); split deferred to Sprint 8
- [x] PSF obligations → **section** on `/school/finance/balances` (Core), not `/school/finance/psf` nav
- [x] `route-groups.ts` home paths: accountant/cashier combined → finance home; exam → exams; timetable officer hidden in Core
- [x] Platform: DPO compliance-only ops nav (master plan §5.2) if not already complete

### Exit criteria

- Core tenant login: no Workflows link, no PSF nav item, PSF visible on balances page
- 375px nav usable for Principal and Finance Officer
- Advanced tenant (seed) still can show gated items when flags on (stub OK)

---

## Sprint 4 — Core leadership home

**Goal:** Owner/Principal daily surface = attention cards, not generic dashboard or inbox module.

### Deliverables

- [x] `AttentionStrip` / badge component (reuse `workflow-inbox-hero` metrics pattern, not full inbox)
- [x] **Core** Owner home: PSF summary section, census status, pending Owner approvals count, refund threshold items
- [x] **Core** Principal home: pending admissions, refunds needing approve, fee amendments, role-change requests pending Owner
- [x] Remove or bypass **generic** dashboard fallback for Owner/Principal in Core
- [x] Do **not** build full master plan §6.1/§6.2 hero dashboards yet — card-first Core layout
- [x] Exam Officer redirect to `/school/exams` unchanged
- [x] Admin / Teacher / Class Teacher dashboards unchanged

### Exit criteria

- Principal completes day-one tasks from home cards without opening `/school/workflows`
- Owner sees census due + items needing one-tap approve

---

## Sprint 5 — Core approvals (no workflow engine UI)

**Goal:** Tier plan §5 approval matrix without Workflow Inbox module.

### Deliverables

- [x] Admission: Principal approve on admissions page (Core default chain)
- [x] Refund: single approver Core — Principal default; **≥ ₦50,000 → Owner**; tenant setting override
- [x] Same-person collapse on refund + role change + census when Owner=Principal user
- [x] **Role change:** Principal submits on staff profile → Owner push/in-app notification → **one-tap approve** (new lightweight approval record or reuse workflow backend without inbox UI)
- [x] Promotions: Principal confirm; held-back **inline** checkbox + reason (not separate workflow type)
- [x] Fee change: Finance Officer proposes → Principal approve inline or notification
- [x] Staff deactivation: Principal with singleton warning (US-HRM-005)

### Exit criteria

- Core refund below ₦50k: Principal only, one step
- Role change cannot finalize without Owner tap
- No `/school/workflows` required in Core

---

## Sprint 6 — Core MFA (SMS hybrid)

**Goal:** Tier plan §4 auth without mandatory TOTP.

### Deliverables

- [x] SMS OTP on first login (Owner, Principal, Finance Officer) via Termii — **BLOCKED** comment if env missing
- [x] Trusted device registry: 30-day persistent token (SRS SEC-AUTH-014 pattern)
- [x] Census lock: SMS OTP step-up (Owner)
- [x] Refund approve: SMS OTP when amount ≥ ₦100,000 (configurable)
- [x] Parents: OTP on payment, password reset, new device only
- [x] Teachers: password only
- [x] Document in tenant-facing copy: Core MFA policy (tier plan §4)
- [x] Rate limit + lockout unchanged

### Exit criteria

- Owner census lock requires SMS in Core (or documented BLOCKED with test bypass in dev only)
- Trusted device skips SMS on day-2 login for Principal

---

## Sprint 7 — Core audit, homes & QA

**Goal:** Ship Core MVP; document and test.

### Deliverables

- [ ] **Simple tenant audit log** page `/school/settings/audit` — read-only list, last 90 days, Core filters (actor, date, action type)
- [ ] API hook `useTenantAuditLogSearch` → existing `GET /tenants/:tenantId/audit/events`
- [ ] Onboarding question: one finance officer vs split (UI only stores `financeMode`; split flow Sprint 8)
- [ ] Settings: tier display read-only Core; Advanced upgrade CTA placeholder
- [ ] Update `docs/loomis-roles-and-logins.md`: Core paths, test logins, tier column
- [ ] **Core QA matrix:** 375px + desktop × Owner, Principal, Admin, Finance Officer, Exam, Teacher, CT, Parent
- [ ] Maestro/smoke: parent smoke + one Core principal path

### Exit criteria

- **Core MVP definition of done** (tier plan §10 checklist complete)
- `pnpm --filter @loomis/web build` clean
- Product sign-off: Core tenant usable at a 10-staff school

---

## Sprint 8 — Advanced: settings & split finance

**Goal:** School Owner self-serves Advanced toggles; split finance works.

### Deliverables

- [ ] Settings → **Experience** section: enable Advanced (Owner); Enterprise shown as "contact Loomis"
- [ ] Toggle `financeMode: split` → enforce two-invite wizard (Cashier + Accountant)
- [ ] Block assigning both roles to one user in split mode
- [ ] Nav switches to Accountant + Cashier labels per master plan §5.4
- [ ] Separate login homes: verify vs log
- [ ] Toggle stubs: timetable dedicated officer, deputy exam, workflows inbox, optional TOTP (enable flags; full UX later)

### Exit criteria

- Advanced tenant can split finance with two distinct staff accounts
- Core tenant unchanged when toggles off

---

## Sprint 9 — Advanced: nav & Workflow Inbox

**Goal:** Master plan §5.4 for Advanced tenants; inbox module live.

### Deliverables

- [ ] Full `school-nav-config.ts` matrix when `tier >= advanced`
- [ ] Workflows nav + `/school/workflows` inbox for approver roles
- [ ] Multi-step templates: refund (Cashier → Accountant → Principal → Owner), grade correction, fee amendment, transfer
- [ ] Principal grade correction: inbox only (no Exams nav)
- [ ] Finance redirects per master plan §2.4
- [ ] Nav role labels: Operations, Registry, Overview, etc.

### Exit criteria

- Advanced Principal uses inbox for grade fixes and fee amendments
- Core tenant still has no Workflows nav

---

## Sprint 10 — Advanced: role dashboards

**Goal:** Master plan §6 full dashboards for Advanced+.

### Deliverables

- [ ] `school-owner-dashboard.tsx` — Financial Command (master plan §6.1)
- [ ] `principal-operations-dashboard.tsx` — Operations (master plan §6.2)
- [ ] Branch in `dashboard/page.tsx` by tier + role
- [ ] Unverified payment amber banner → Accountant verify queue (read-only link for Owner/Principal)
- [ ] Remove generic fallback for Owner, Principal, Accountant, Cashier when Advanced
- [ ] Core keeps Sprint 4 card homes when `tier === core`

### Exit criteria

- Advanced Owner/Principal dashboards match master plan spec
- Core still uses card homes

---

## Sprint 11 — Advanced: optional roles & chains

**Goal:** Timetable Officer, Deputy Exam, extended workflows.

### Deliverables

- [ ] `timetable.dedicatedOfficer` → Timetable Officer invite + `/school/timetable` home
- [ ] Core: Principal/Teacher timetable paths unchanged when flag off
- [ ] `deputy_exam_enabled` → Deputy invite + 72h server rule surfaced in UI
- [ ] Exam Officer corrections on `/school/exams?section=corrections`
- [ ] Multi-step refund chain when Advanced + workflows enabled
- [ ] Admission optional Owner step in workflow template
- [ ] PSF top-level nav for Owner/Accountant when Advanced (optional; balances section still OK for Core)

### Exit criteria

- Deputy only visible when Advanced flag on
- 4-step refund works on Advanced fixture tenant

---

## Sprint 12 — Advanced: auth+, audit+, story gaps

**Goal:** Optional TOTP, enhanced audit, remaining master plan Phase C (non-Enterprise).

### Deliverables

- [ ] Optional TOTP MFA for school (Advanced toggle)
- [ ] Audit export + advanced filters (Advanced)
- [ ] Balances export US-FIN-005
- [ ] Admission offer letter step US-SIS-002
- [ ] Workflow card enrichment: fee amendment diff, transfer context
- [ ] Promotion held-back → Owner prompt when Advanced (can use inbox)
- [ ] Remove remaining `role ===` hacks → capabilities (master plan Phase D partial)

### Exit criteria

- Advanced school can enable TOTP without forcing Core tenants
- Export and offer letter work against real API

---

## Sprint 13 — Enterprise activation

**Goal:** Loomis-team-gated Enterprise features.

### Deliverables

- [ ] Platform admin: set tenant `experienceTier=enterprise`
- [ ] **Attestations API:** `GET /tenants/:tenantId/attestations` + contract + hook
- [ ] `/school/academic/attestations` read-only UI
- [ ] **Emergency publish:** backend `emergencyEscalationActive` flag; Principal publish UI gated (master plan §7)
- [ ] Mandatory step-up TOTP for Enterprise high-risk actions
- [ ] Full master plan §7 workflow table for Enterprise tenants
- [ ] Hard SoD UI messaging (Appendix A)

### Exit criteria

- Enterprise tenant cannot Principal-publish without escalation flag
- Attestation history lists census lock records
- Core/Advanced unaffected

---

## Sprint 14 — Finish, regression & pilot

**Goal:** Production-ready role experience across tiers.

### Deliverables

- [ ] Full **master plan §3** manual test matrix (Advanced/Enterprise tenant)
- [ ] Full **tier plan §3** manual test matrix (Core tenant)
- [ ] `docs/loomis-roles-and-logins.md` complete: all roles, tiers, homes
- [ ] Cursor rules verified against tier + master plan
- [ ] Performance pass: dashboard load, nav filter
- [ ] Pilot: one real school on **Core** for 2 weeks; one on **Advanced** optional
- [ ] Known BLOCKED items list (Termii prod, etc.) in README or ops doc
- [ ] Changelog / release notes for role experience v1

### Exit criteria

- No nav link 403 for allowed role+tier combination
- Core pilot school can: enroll, log payment, verify, census (Owner), publish results, parent pay fees
- Engineering sign-off + product sign-off

---

## Cross-sprint dependencies

```text
Sprint 1 ──► everything
Sprint 2 ──► 3, 5, 6, 8
Sprint 3 ──► 4, 7
Sprint 4 ──► 5 (badges link to approvals)
Sprint 6 ──► 7 (census OTP)
Sprint 7 ──► CORE MVP SHIP
Sprint 8 ──► 9, 11
Sprint 9 ──► 10, 11
Sprint 13 ──► attestation API before UI (same sprint ordered)
```

**Parallelizable after Sprint 7:** Mobile parent/student polish, unrelated feature epics — but role nav must use `useTenantExperience()`.

---

## Per-sprint test checklist (minimal)

| Role | Core (S7+) | Advanced (S12+) |
|------|------------|-----------------|
| Owner | Home cards, census SMS, audit, approve role change | + Financial dashboard, PSF nav optional |
| Principal | Admissions, badges, no inbox | + Operations dashboard, inbox |
| Finance Officer | Combined desk, log+verify | Split: accountant OR cashier only |
| Exam Officer | Exams home, publish confirm | + Deputy if flagged |
| Admin | Registry dashboard | Same |
| Teacher / CT | Desk / My Class | Same |
| Parent | Mobile fees, messages | Same |

---

## What to tell Cursor / engineers each sprint

```text
Sprint N — [theme]
Tier: Core | Advanced | Enterprise
Docs: ROLE_EXPERIENCE_TIER_PLAN §X + MASTER_PLAN §Y (if Advanced+)
Gate all new nav with useTenantExperience().
Do not implement master-plan-only items for Core tenants.
```

---

## Document references

| Doc | Use |
|-----|-----|
| `ROLE_EXPERIENCE_TIER_PLAN.md` | Sprints 1–7 primary; 8–12 toggles |
| `ROLE_EXPERIENCE_MASTER_PLAN.md` | Sprints 9–14 Advanced/Enterprise |
| `Loomis_User_Stories_v1.md` | Acceptance criteria per feature |
| `loomis-roles.mdc` | API hard rules |

---

*End of roadmap.*
