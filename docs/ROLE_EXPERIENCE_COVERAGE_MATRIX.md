# Role Experience — Coverage Matrix (Phase 3.75)

**Status:** Audit closure (Phases A–D) complete  
**Date:** June 2026  
**Authority:** `ROLE_EXPERIENCE_MASTER_PLAN.md` §2–§6, `packages/core/src/capabilities.ts`

Cross-reference manual QA: [`CORE_QA_MATRIX.md`](./CORE_QA_MATRIX.md) · [`ADVANCED_QA_MATRIX.md`](./ADVANCED_QA_MATRIX.md)

Legend: ✅ Implemented · ⚠️ Partial / tier-gated · ❌ Not implemented · 🔒 BLOCKED (external dependency)

---

## Audit closure summary (Phases A–D)

| Phase | Scope | Status |
|-------|--------|--------|
| **A** | Capabilities spine, nav, homes, platform order | ✅ |
| **B** | Tier infrastructure (Sprints 8–14) | ✅ |
| **C** | Workflow dedup (§2.3 canonical surfaces) | ✅ |
| **D** | Replace permission `role ===` with `useCan` / `requireCapability` | ✅ |

Key decisions applied:

- **Principal may census lock** on all tiers (master plan §2.2; supersedes tier-plan “Owner only” note).
- **`student.promote.confirm`** — Owner + Principal only; Admin stages with `student.promote`.
- **`audit.export`** — Owner only; Advanced+ with step-up.
- **Admin Officer** — no `finance.balances.view`, no `student.graduate`.
- **Teacher login home** — `/school/dashboard` (Teacher Desk), not `/school/timetable`.

---

## Platform & regional roles

| Role | Login home | Primary nav | Key stories | Status |
|------|------------|-------------|-------------|--------|
| **platform_owner** | `/platform/dashboard` | Dashboard → Tenants → Approvals → Risk → PSF → Ledger → Referrals → KYC | US-PLT ops, privileged approvals | ✅ |
| **platform_admin** | `/platform/dashboard` | Same order as Owner | US-PLT tenant provisioning | ✅ |
| **dpo** | `/platform/compliance` | Compliance-only workspace | US-PLT compliance | ✅ |
| **regional_manager** | `/regional/dashboard` | Dashboard → Onboard → Subordinates → Earnings | US-REG | ✅ |
| **regional_subordinate** | `/regional/dashboard` | Dashboard → Onboard → Earnings | US-REG | ✅ |

---

## School roles — navigation & home

| Role | Home path | Dashboard component | Workflows nav | Attestations (Enterprise) | Balances nav |
|------|-----------|---------------------|---------------|---------------------------|--------------|
| **school_owner** | `/school/dashboard` | Financial Command (Advanced) / Core owner | Advanced+ | ✅ | ✅ |
| **principal** | `/school/dashboard` | Operations (Advanced) / Core principal | Advanced+ | ✅ | ✅ |
| **admin_officer** | `/school/dashboard` | Registry | ❌ Core/Adv | ❌ | ❌ |
| **accountant** | `/school/finance/payments/verify` | Verify desk hero | Advanced+ | ❌ | ✅ |
| **cashier** | `/school/finance/payments/log` | Log desk | ❌ | ❌ | ❌ |
| **exam_officer** | `/school/exams` | Redirect | ❌ | ❌ | ❌ |
| **deputy_exam_officer** | `/school/exams` | Redirect | ❌ | ❌ | ❌ |
| **timetable_officer** | `/school/timetable` | Builder | ❌ | ❌ | ❌ |
| **teacher** | `/school/dashboard` | Teacher Desk | ❌ | ❌ | ❌ |
| **class_teacher** | `/school/dashboard` | My Class | ❌ | ❌ | ❌ |

Regression: `apps/web/src/components/school/school-nav-config.regression.test.ts`  
Dashboard resolver: `apps/web/src/lib/auth/school-dashboard-resolver.test.ts`

---

## School roles — capabilities & permission gates

| Capability | Roles | UI hook / API | Status |
|------------|-------|---------------|--------|
| `census.lock` | Owner, Principal | `/school/academic/census-lock`; `requireCapability` on preview | ✅ |
| `student.promote.confirm` | Owner, Principal | `useCanConfirmPromotions()` on promotions page | ✅ |
| `audit.export` | Owner | `useCanExportAudit()`; `requireCapability` on export route | ✅ |
| `staff.role.request` | Principal | Staff detail request UI; `can()` in staff.service | ✅ |
| `staff.role.assign` | Owner | Staff detail finalize; workflow inbox | ✅ |
| `refund.initiate` / `refund.approve` | Cashier / Acct+Leadership | `useCanViewRefunds()` on refunds page | ✅ |
| `finance.balances.view` | Owner, Principal, Accountant | Nav + balances routes; **not** Admin | ✅ |

Valid `role ===` exceptions (not permission gates): home routing, nav labels, deputy/timetable tier flags, Principal emergency publish UX banner.

---

## Workflow canonical surfaces (§2.3)

| Workflow | Canonical surface | Approvers | Duplicate removed | Status |
|----------|-------------------|-----------|-------------------|--------|
| Grade correction | EO: `/school/exams?section=corrections`; Principal: inbox | EO → Principal | No Exams nav for Principal | ✅ |
| Refund approval | Inbox + `/school/finance/refunds` timeline | Cashier → Acct → Principal → Owner | Single timeline | ✅ |
| Fee structure amendment | Accountant: `/school/finance`; Principal: **inbox only** (Advanced) | Acct → Principal → Owner | Core inline only when inbox disabled | ✅ |
| Staff role change | Principal: staff request; Owner: inbox + finalize | Principal → Owner | No direct PUT for Principal | ✅ |
| Promotion confirm | `/school/academic/promotions` | Admin stages; Owner/Principal confirm | `student.promote.confirm` cap | ✅ |
| Census lock | `/school/academic/census-lock` | Owner, Principal | No duplicate under sessions | ✅ |
| Admission decision | `/school/students/admissions` + optional workflow | Principal (+ Owner) | Dashboard count + link only | ✅ |
| Student transfer out | Student profile + inbox | Admin → Principal | No separate page | ⚠️ |
| Held-back override | Workflow inbox | Owner | From promotion confirm dialog | ⚠️ |
| **Term closure** | — | — | — | 🔒 BLOCKED: contract only; no API handler / UI |

Deep links: `core-inline-workflow-decision.tsx` → fee amendment href `/school/workflows`.

---

## Story × implementation (school layer excerpt)

| Story | Actor | Route / surface | Status | Notes |
|-------|-------|-----------------|--------|-------|
| US-ASM-003 | Owner, Principal | Census lock | ✅ | Principal enabled all tiers |
| US-ASM-005 | Admin (stage), Owner/Principal (confirm) | Promotions | ✅ | `student.promote.confirm` |
| US-HRM-004 | Principal (request), Owner (finalize) | Staff + workflows | ✅ | Capability-first API |
| US-FIN-001 | Accountant, Principal, Owner | Finance + workflows | ✅ | Advanced: Principal inbox-only |
| US-FIN-006 | Cashier → … → Owner | Refunds + workflows | ✅ | 4-step on Advanced+ |
| US-SIS-002 | Principal, Owner | Admissions | ✅ | Optional Owner step |
| US-ACA-003 | EO, Principal | Exams corrections + inbox | ✅ | |
| US-HRM-008 | All school roles | Settings → Security | ✅ | MFA policy by tier |
| Attestation history | Owner, Principal | `/school/academic/attestations` | ✅ | Enterprise nav; list API |
| Audit export | Owner | Settings → Audit | ✅ | Advanced+ step-up |

Full user story catalogue: `Loomis_User_Stories_v1.md`.

---

## Parent / student / mobile

| Role | Web home | Mobile stack | Status |
|------|----------|--------------|--------|
| **parent** | `/parent/dashboard` | `(parent)` tabs | ✅ |
| **student** | `/parent/dashboard` | `(student)` tabs | ✅ |
| **teacher** | `/school/dashboard` | `(teacher)` — unsupported school admin on mobile | ✅ |
| **class_teacher** | `/school/dashboard` | `(class-teacher)` attendance | ✅ |

Parent/student use **role identity**, not `can()` — by design (§2.1).

---

## Known gaps (document only — out of audit closure scope)

| Item | Reason |
|------|--------|
| Term closure workflow UI | No backend handler |
| Live 2-week pilot | Manual — [`PILOT_CHECKLIST.md`](./PILOT_CHECKLIST.md) |
| Playwright E2E for full matrix | Manual QA matrices remain source of truth |
| Termii/SES prod | [`KNOWN_BLOCKERS.md`](./KNOWN_BLOCKERS.md) |

---

## Verification commands

```bash
pnpm --filter @loomis/core test
pnpm --filter @loomis/web test -- school-nav-config school-dashboard-resolver
pnpm --filter @loomis/web build
```

Capability alignment tests: `packages/core/src/capabilities.sprint2.test.ts`, `capabilities.audit-alignment.test.ts`.
