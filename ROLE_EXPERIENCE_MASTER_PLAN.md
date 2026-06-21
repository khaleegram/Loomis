# Loomis — Role Experience Master Plan

**Status:** Authoritative reference for **Advanced and Enterprise** role UX — navigation, workflows, and full approval chains.  
**Version:** 1.1  
**Date:** 21 June 2026  
**Supersedes:** Ad-hoc per-role audits, conflicting dashboard patterns, and implicit nav behaviour in code comments. v1.0 validation review decisions incorporated (see Appendix B).

> **Core tenants:** `ROLE_EXPERIENCE_TIER_PLAN.md` takes precedence for default UX, MFA friction, approval matrix, and feature visibility.  
> **This document applies** when Advanced or Enterprise features are enabled for a tenant (or per-feature flag).  
> **Backend integrity** (PSF, audit, SoD, tenant isolation) is never tier-gated — see tier plan §0.

**Authority order when building or changing role experiences:**

1. **`ROLE_EXPERIENCE_TIER_PLAN.md`** — Core defaults and tier toggles (check tenant tier first)
2. **This document** (`ROLE_EXPERIENCE_MASTER_PLAN.md`) — Advanced + Enterprise surfaces
3. `Loomis_User_Stories_v1.md` + `Loomis_SRS_v3.md`
4. `packages/core/src/capabilities.ts` (must match §2.2 of this plan when Advanced/Enterprise caps apply)
5. `loomis-roles.mdc` (API enforcement)
6. Existing UI patterns listed in §9

**When to re-audit:** Only when new user stories, new roles, or materially new business rules are introduced — not when implementing features covered here.

---

## 1. Platform architecture

### 1.1 Consoles

| Console | URL prefix | Roles | Mobile |
|---------|------------|-------|--------|
| Platform Operations | `/platform/*` | `platform_owner`, `platform_admin` | Not supported → `(auth)/unsupported` |
| Platform Compliance | `/platform/compliance/*` | `dpo` (+ read access for Owner/Admin) | Not supported |
| Regional | `/regional/*` | `regional_manager`, `regional_subordinate` | Not supported |
| School | `/school/*` | All 10 school staff roles | Not supported (except see mobile stacks) |
| Parent / Student (web) | `/parent/*` | `parent`, `student` | Parent + Student primary on mobile |
| Mobile teaching | Expo stacks | `parent`, `student`, `teacher`, `class_teacher` | Primary |

### 1.2 Workspace types (exactly one primary per role)

| Type | Definition |
|------|------------|
| **Command Center** | Cross-module KPIs + “what needs my decision today” |
| **Operations Center** | High-frequency data entry (registry, payment log, attendance) |
| **Workflow Workspace** | Approve / reject / return queue |
| **Financial Workspace** | Fees, verification, balances, PSF, refunds |
| **Learning Workspace** | Timetable, gradebook, assignments, exams, results |
| **Monitoring Workspace** | Audit, compliance, IVP, regional portfolio health |
| **Communication Workspace** | Announcements and messaging |

---

## 2. Resolved conflicts (binding decisions)

These decisions are **final**. Implementation must conform; do not re-open without a user-story change.

### 2.1 Permission & capability conflicts

| Conflict | Decision | Rationale |
|----------|----------|-----------|
| **US-HRM-004** vs Principal `staff.role.assign` | **Principal initiates role-change requests; School Owner approves and finalizes.** Assign `staff.role.request` to Principal (initiate UI + workflow submit). Assign `staff.role.assign` to Owner only (finalize write). Principal must not call direct role-change PUT without Owner approval. Align API with workflow or reject unauthorized finalize. | US-HRM-004 ("School Owner approval"); SRS Principal participation; segregation of duties. |
| Principal `gradebook.write` | **Keep capability** for SRS emergency grade entry only. **No gradebook nav** for Principal. Route exists for break-glass API parity only. | SRS emergency path; not daily UX. |
| Owner lacks `admissions.approve` | **Add `admissions.approve` to School Owner** in `capabilities.ts`. Owner may appear as optional second step in admission workflow. | Workflow chain includes Owner; story allows Owner approval. |
| Owner PSF (US-REV-001) vs `fee.configure` nav gate | **PSF Obligations nav uses `ledger.view`**, not `fee.configure`. Owner and **Accountant** see PSF (read-only). | Owner reads PSF; Accountant reconciles PSF per SRS; fee.configure remains separate. |
| Principal / Owner balances access via `role ===` hack | **Introduce `finance.balances.view`** capability. Assign to `school_owner`, `principal`, `accountant`. Remove hardcoded role checks in UI **and API** (`outstanding-balances` routes must use capability, not role allow-list). Owner school-wide balance visibility is **approved** (financial accountability supersedes US-FIN-005 actor list). | Single gating mechanism; product decision v1.1. |
| Parent empty capabilities | **By design.** Parent/student web and mobile use **role identity**, not `can()`. Do not add capabilities to parent/student unless cross-tenant rules require it. | Parent is cross-tenant; capabilities map is school-scoped. |
| Deputy Exam Officer | **Same UI and nav as Exam Officer** when active (72h rule enforced server-side). Nav label: “Exams”. | SRS FR-ACA deputy activation. |
| Admin Officer `student.promote` without confirm | **Admin stages only; cannot confirm.** Confirm button uses `useCanConfirmPromotions` (Principal + Owner). | US-ASM-005 acceptance criteria. |

### 2.2 Target capability map (school layer excerpt)

Full alignment PR must update `packages/core/src/capabilities.ts` to match this table.

| Capability | Owner | Principal | Admin | Accountant | Cashier | Exam | Dep. Exam | Timetable | Teacher | Class Teacher |
|------------|:-----:|:---------:|:-----:|:----------:|:-------:|:----:|:---------:|:---------:|:-------:|:-------------:|
| `staff.onboard` | ✓ | ✓ | ✓ | | | | | | | |
| `staff.role.request` | | ✓ | | | | | | | | |
| `staff.role.assign` | ✓ | | | | | | | | | |
| `staff.deactivate` | ✓ | ✓ | | | | | | | | |
| `subject.assign` | | ✓ | ✓ | | | | | | | |
| `classteacher.assign` | | ✓ | ✓ | | | | | | | |
| `admissions.manage` | | | ✓ | | | | | | | |
| `admissions.approve` | ✓ | ✓ | ✓* | | | | | | | |
| `academic_year.manage` | ✓ | ✓ | | | | | | | | |
| `term.manage` | ✓ | ✓ | | | | | | | | |
| `census.lock` | ✓ | ✓ | | | | | | | | |
| `student.promote` | ✓ | ✓ | ✓ | | | | | | | |
| `student.graduate` | ✓ | ✓ | | | | | ✓ | | | |
| `class_structure.manage` | ✓ | ✓ | ✓ | | | | | | | |
| `timetable.manage` | ✓ | ✓ | | | | | | ✓ | | |
| `timetable.view` | | | ✓ | | | | | | ✓ | ✓ |
| `attendance.mark` | | | | | | | | | | ✓ |
| `attendance.view` | ✓ | ✓ | ✓ | | | | | | | ✓ |
| `gradebook.read` | | ✓ | | | | ✓ | ✓ | | ✓ | ✓ |
| `gradebook.write` | | ✓* | | | | | | | ✓ | |
| `grading_scheme.configure` | | | | | | ✓ | ✓ | | | |
| `result.publish` | | | | | | ✓ | ✓ | | | |
| `fee.configure` | | | | ✓ | | | | | | |
| `finance.balances.view` | ✓ | ✓ | ✓ | | | | | | | |
| `payment.log` | | | | | ✓ | | | | | |
| `payment.verify` | | | | ✓ | | | | | | |
| `refund.initiate` | | | | | ✓ | | | | | |
| `refund.approve` | ✓ | ✓ | | ✓ | | | | | | |
| `ledger.view` | ✓ | | | ✓ | | | | | | |
| `audit.view` | ✓ | ✓ | | | | | | | | |
| `parent.message` | ✓ | ✓ | ✓ | | | ✓ | ✓ | | | ✓ |

\*Principal `gradebook.write` — API only for emergency; no nav.

`staff.role.request` — Principal may submit role-change requests only; `staff.role.assign` — Owner finalizes approved changes only.

Platform and regional capabilities unchanged from current `capabilities.ts`.

---

### 2.3 Duplicate workflow resolution

| Workflow | Canonical UI surface | Who uses it | Removed / demoted surface |
|----------|---------------------|-------------|---------------------------|
| **Grade correction** (US-ACA-003) | Exam Officer: `/school/exams?section=corrections` | Exam Officer, Deputy Exam Officer | — |
| **Grade correction — Principal step** | `/school/workflows` inbox only | Principal, School Owner (if ever in chain) | **No** Exams nav for Principal; no duplicate list on dashboard |
| **Refund approval** (US-FIN-006) | `/school/workflows` + detail on `/school/finance/refunds` | Accountant (step 1), Principal (step 2), Owner (step 3) | Single timeline on refunds page; inbox for actions |
| **Admission decision** (US-SIS-002) | `/school/students/admissions` (decide) + workflow when configured | Principal (+ Owner optional step) | Not duplicated on generic dashboard — **count + link only** on home |
| **Fee structure amendment** (US-FIN-001) | Accountant: request on `/school/finance`; Principal: **workflow inbox only** | Accountant, Principal | Principal never lands on fee structure editor |
| **Student transfer out** (US-SIS-006) | Admin initiates on student profile; Principal approves in **workflow inbox** | Admin Officer, Principal | No separate transfer approval page |
| **Promotion confirm** (US-ASM-005) | `/school/academic/promotions` confirm action | Principal, Owner | Admin stages on same page; held-back override → Owner workflow surfaced in confirm dialog |
| **Held-back override** | Workflow inbox | School Owner | Triggered from promotion confirm when threshold exceeded |
| **Census lock** (US-ASM-003) | `/school/academic/census-lock` only | Owner, Principal | Not duplicated under `/school/sessions/*` (redirects stay) |
| **Staff role change** (US-HRM-004) | Principal: `/school/staff` → request; Owner: **workflow inbox** + finalize | Principal initiates, Owner approves | No direct role PUT for Principal; no duplicate change UI on dashboard |
| **Privileged platform changes** | `/platform/approvals` | Owner, Admin | Not on main dashboard cards and approvals page |

### 2.4 Duplicate screen resolution

| Screen domain | Decision |
|---------------|----------|
| **School dashboard** | **Six distinct home components** (§4). Retire shared generic fallback for Owner, Principal, Accountant, Cashier. |
| **Finance entry** | **No role uses `/school/finance` hub unless they have `fee.configure`.** Owner → `/school/finance/balances`. Principal → `/school/finance/balances`. Accountant → `/school/finance/payments/verify`. Cashier → `/school/finance/payments/log`. |
| **Exams module** | Nav visible only for roles with `grading_scheme.configure` OR `result.publish`. Read-only gradebook readers use gradebook/report cards, not Exams. |
| **Gradebook** | Nav for Teacher, Class Teacher (read), Exam Officer (read). **Hidden** for Owner, Principal, Admin, Accountant, Cashier, Timetable Officer. |
| **Assignments** | Nav for Teacher, Class Teacher, Student (web/mobile). **Hidden** for Owner, Principal, Admin, Exam Officer. |
| **Platform dashboard vs compliance** | **DPO never lands on `/platform/dashboard`.** DPO workspace menu shows **Compliance only**. Owner/Admin never see compliance items in primary ops menu (optional footer link to compliance posture read-only). |
| **Audit log** | Platform global: `/platform/compliance/audit`. Tenant-scoped: **`/school/settings/audit`** (new). Same table/filter pattern; different API hook. |
| **Attestation history** | **`/school/academic/attestations`** (new, read-only). Owner + Principal. Not duplicated on census-lock page. **Blocked until list API exists** (§8). |

### 2.5 Navigation inconsistencies — resolved rules

1. **Nav visibility = capability OR `always` flag** in nav config. No ad-hoc `role ===` in nav except labels (§5).
2. **Workspace menu order** is role-specific (§5). First item = primary workspace type.
3. **Login redirect** = `homePathForRole` (§4). Must match post-login landing in this plan.
4. **Ledger Flows** sidebar section: only roles with any of `finance.balances.view`, `payment.log`, `payment.verify`, `refund.initiate`, `refund.approve`, `ledger.view`.
5. **Settings** always last; includes Security (US-HRM-008) for all authenticated roles.
6. **Mobile:** school admin roles → `/unsupported` with message to use web. No web nav parity attempted on mobile for school console.

---

## 3. Master role specification

### 3.1 Platform Owner

| Field | Value |
|-------|-------|
| **Mission** | Platform revenue integrity and strategic control |
| **Workspace type** | Command Center + Monitoring |
| **Login home** | `/platform/dashboard` |
| **Primary screens** | Dashboard, Ledger, Approvals, Risk Cases |
| **Secondary screens** | Tenants, PSF Rates, Referrals, KYC |
| **Hidden** | Compliance write queues (DSAR/breach management) |
| **Primary actions** | Approve privileged changes, monitor IVP, review revenue |
| **Approvals** | PSF overrides (not own requests), waivers, dual-control |
| **Reports consumed** | Platform ledger, revenue chart, IVP summary |

### 3.2 Platform Admin

| Field | Value |
|-------|-------|
| **Mission** | Tenant provisioning, support, investigations |
| **Workspace type** | Operations Center + Monitoring |
| **Login home** | `/platform/dashboard` |
| **Primary screens** | Tenants, Approvals, Risk Cases, KYC |
| **Secondary screens** | Dashboard, Referrals, PSF Rates (read), Ledger (read) |
| **Hidden** | — |
| **Primary actions** | Provision/suspend tenant, break-glass, assign IVP cases |
| **Approvals** | PSF override as approver (not requester), KYC |
| **Reports consumed** | Tenant list, case queue, referral pipeline |

### 3.3 DPO

| Field | Value |
|-------|-------|
| **Mission** | NDPA compliance operations |
| **Workspace type** | Monitoring + Workflow |
| **Login home** | `/platform/compliance` |
| **Primary screens** | Compliance Posture, DSAR Queue, Breach Records |
| **Secondary screens** | Retention & Consent, Audit Log (global search) |
| **Hidden** | **All platform ops nav** (Tenants, PSF, Ledger, Referrals, Risk ops) |
| **Primary actions** | Process DSAR, record breach, configure retention |
| **Approvals** | — |
| **Reports consumed** | Compliance posture dashboard |

### 3.4 Regional Manager

| Field | Value |
|-------|-------|
| **Mission** | Regional portfolio growth and school health |
| **Workspace type** | Command Center + Analytics |
| **Login home** | `/regional/dashboard` |
| **Primary screens** | Dashboard, Onboard School |
| **Secondary screens** | Subordinates, Referral Earnings |
| **Hidden** | — |
| **Primary actions** | Onboard school, review at-risk schools |
| **Approvals** | Subordinate KYC (not own subordinate per SoD) |
| **Reports consumed** | Regional analytics, choropleth, earnings |

### 3.5 Regional Subordinate

| Field | Value |
|-------|-------|
| **Mission** | Onboard schools in assigned portfolio |
| **Workspace type** | Operations Center |
| **Login home** | `/regional/dashboard` |
| **Primary screens** | Onboard School, Dashboard |
| **Secondary screens** | Referral Earnings |
| **Hidden** | Subordinates |
| **Primary actions** | Submit onboarding with referral code |
| **Approvals** | — |
| **Reports consumed** | Own portfolio metrics |

### 3.6 School Owner

| Field | Value |
|-------|-------|
| **Mission** | Proprietor — financial accountability, census, strategic approvals |
| **Workspace type** | Command Center + Financial |
| **Login home** | `/school/dashboard` → **Financial Command Dashboard** (§6.1) |
| **Primary screens** | Dashboard, Workflows, PSF Obligations, Balances, Academic (census), Attestations |
| **Secondary screens** | Staff (read/deactivate), Refunds, Students, Attendance, Settings › Audit |
| **Hidden nav** | Gradebook, Assignments, Exams, Timetable (link from academic only), Payment log/verify |
| **Primary actions** | Census lock, final refund approval, view PSF ledger, **finalize staff role changes** |
| **Approvals** | Refunds (final), held-back overrides, optional admission step, **staff role changes (final approver)** |
| **Reports consumed** | PSF obligations, balances, attestation history, tenant audit |

### 3.7 Principal

| Field | Value |
|-------|-------|
| **Mission** | Operational head — approvals, academics, staff supervision |
| **Workspace type** | Workflow + Command |
| **Login home** | `/school/dashboard` → **Operations Dashboard** (§6.2) |
| **Primary screens** | Dashboard, Workflows, Admissions, Academic, Staff |
| **Secondary screens** | Balances, Refunds, Comms, Students, Attendance, Promotions, Graduation |
| **Hidden nav** | Finance hub, PSF, Exams, Gradebook, Assignments, Payment log/verify |
| **Primary actions** | Approve admissions/refunds/grade fixes/fees, assign teachers, census lock, broadcast, **request staff role changes** |
| **Approvals** | Admissions, refunds (mid-chain), grade corrections, fee amendments, transfers |
| **Reports consumed** | Workflow counts, balances summary, term lifecycle |

### 3.8 Admin Officer

| Field | Value |
|-------|-------|
| **Mission** | Registry — admissions, enrollment, parent links |
| **Workspace type** | Operations Center |
| **Login home** | `/school/dashboard` → **Registry Dashboard** (existing `AdminOfficerDashboard`) |
| **Primary screens** | Dashboard (label **Registry**), Admissions, Students, Staff |
| **Secondary screens** | Academic › Promotions (stage), Structure, Comms, Attendance |
| **Hidden nav** | Workflows, Finance, Exams, Gradebook |
| **Primary actions** | Create application, enroll, initiate parent link, invite staff, stage promotions |
| **Approvals** | — |
| **Reports consumed** | Pipeline counts, pending invitations |

### 3.9 Accountant

| Field | Value |
|-------|-------|
| **Mission** | Fee configuration, payment verification, financial reporting |
| **Workspace type** | Financial Workspace |
| **Login home** | `/school/finance/payments/verify` |
| **Primary screens** | Verify Queue, Fee Structures, Balances, **PSF Obligations (read-only)**, Reconciliation |
| **Secondary screens** | Refunds (approve step 1), Workflows |
| **Hidden nav** | Staff, Students, Academic, Exams, Gradebook, Assignments, Timetable |
| **Primary actions** | Verify payment, configure fees, request fee amendment |
| **Approvals** | Refunds (first approver) |
| **Reports consumed** | Outstanding balances, unverified payment aging, **PSF obligation status** |

### 3.10 Cashier

| Field | Value |
|-------|-------|
| **Mission** | Log offline payments and initiate refunds |
| **Workspace type** | Financial Operations |
| **Login home** | `/school/finance/payments/log` |
| **Primary screens** | Payment Log |
| **Secondary screens** | Refunds (initiate only) |
| **Hidden nav** | All except Finance (log + refunds), Settings |
| **Primary actions** | Log payment, initiate refund request |
| **Approvals** | — |
| **Reports consumed** | Own logged payments (session list on page) |

### 3.11 Exam Officer & Deputy Exam Officer

| Field | Value |
|-------|-------|
| **Mission** | Grading schemes, corrections, result publish |
| **Workspace type** | Learning + Workflow |
| **Login home** | `/school/exams` |
| **Primary screens** | Exams (schemes, corrections, publish) |
| **Secondary screens** | Gradebook (read all), Report cards |
| **Hidden nav** | Dashboard, Staff, Students, Finance, Academic hub, Workflows (use Exams corrections) |
| **Primary actions** | Publish results, review corrections, manage scheme |
| **Approvals** | Grade correction step 1 |
| **Reports consumed** | Publish readiness, pending corrections |

Deputy Exam Officer: identical spec; server enforces 72h activation.

### 3.12 Timetable Officer

| Field | Value |
|-------|-------|
| **Mission** | Build and publish class schedules |
| **Workspace type** | Learning (builder) |
| **Login home** | `/school/timetable` |
| **Primary screens** | Timetable builder, Publish, Bell schedule |
| **Secondary screens** | — |
| **Hidden nav** | Dashboard, all non-timetable items except Settings |
| **Primary actions** | Assign periods, resolve conflicts, publish |
| **Approvals** | — |
| **Reports consumed** | Conflict detection on builder |

### 3.13 Teacher

| Field | Value |
|-------|-------|
| **Mission** | Teach assigned subjects — grades and assignments |
| **Workspace type** | Learning Workspace |
| **Login home** | `/school/dashboard` → **Teacher Desk** (existing `TeacherLanding`) |
| **Primary screens** | My Schedule (`/school/timetable`), Gradebook, Assignments |
| **Secondary screens** | Report cards (read) |
| **Hidden nav** | Staff, Students, Finance, Academic, Workflows, Attendance |
| **Primary actions** | Enter scores, create assignments |
| **Approvals** | — |
| **Reports consumed** | Own subject roster |

Mobile: Teacher stack — gradebook offline, assignments.

### 3.14 Class Teacher

| Field | Value |
|-------|-------|
| **Mission** | Class attendance, parent communication, read-only class grades |
| **Workspace type** | Operations + Learning |
| **Login home** | `/school/dashboard` → **My Class** (existing `ClassTeacherDashboard`) |
| **Primary screens** | Dashboard, Attendance, Comms |
| **Secondary screens** | Class Gradebook (read), My Schedule, Assignments |
| **Hidden nav** | Staff, Students registry, Finance, Academic, Workflows |
| **Primary actions** | Mark attendance, message class parents |
| **Approvals** | — |
| **Reports consumed** | Class roll, today’s attendance |

Mobile: Class Teacher stack — attendance ≤3 taps, offline sync.

### 3.15 Parent

| Field | Value |
|-------|-------|
| **Mission** | Monitor children across schools; pay fees; communicate |
| **Workspace type** | Command + Financial + Communication |
| **Login home** | `/parent/dashboard` |
| **Primary screens** | Dashboard, Fees, Messages |
| **Secondary screens** | Attendance, Results, Timetable, Contact settings |
| **Hidden nav** | Assignments |
| **Primary actions** | Pay fees, reply to messages, accept parent link (OTP) |
| **Approvals** | — |
| **Reports consumed** | Per-child cards (attendance, results, fees) |

Mobile: primary; web supported.

### 3.16 Student

| Field | Value |
|-------|-------|
| **Mission** | Own learning — timetable, assignments, results |
| **Workspace type** | Learning Workspace |
| **Login home** | `/parent/dashboard` (student mode) |
| **Primary screens** | Dashboard, Timetable, Assignments, Results |
| **Secondary screens** | Attendance, Messages |
| **Hidden nav** | Fees |
| **Primary actions** | Submit assignment, view results |
| **Approvals** | — |
| **Reports consumed** | Own attendance and grades |

Mobile: primary; web via parent route group.

---

## 4. Login homes (`homePathForRole`)

| Role | Path |
|------|------|
| `platform_owner` | `/platform/dashboard` |
| `platform_admin` | `/platform/dashboard` |
| `dpo` | `/platform/compliance` |
| `regional_manager` | `/regional/dashboard` |
| `regional_subordinate` | `/regional/dashboard` |
| `school_owner` | `/school/dashboard` |
| `principal` | `/school/dashboard` |
| `admin_officer` | `/school/dashboard` |
| `accountant` | `/school/finance/payments/verify` |
| `cashier` | `/school/finance/payments/log` |
| `exam_officer` | `/school/exams` |
| `deputy_exam_officer` | `/school/exams` |
| `timetable_officer` | `/school/timetable` |
| `teacher` | `/school/dashboard` |
| `class_teacher` | `/school/dashboard` |
| `parent` | `/parent/dashboard` |
| `student` | `/parent/dashboard` |

Implementation: update `apps/web/src/lib/auth/route-groups.ts` to match exactly.

---

## 5. Navigation specifications

### 5.1 Platform Operations (`platform_owner`, `platform_admin`)

Order: Dashboard → Tenants → Approvals → Risk Cases → PSF Rates → Ledger → Referrals → KYC

Compliance: footer link “Compliance posture” (read-only) for Owner/Admin only.

### 5.2 Platform Compliance (`dpo` only workspace)

Order: Compliance Posture → DSAR Queue → Breach Records → Retention & Consent → Audit Log

No ops items in workspace menu.

### 5.3 Regional

**Manager:** Dashboard → Onboard School → Subordinates → Referral Earnings  
**Subordinate:** Dashboard → Onboard School → Referral Earnings

### 5.4 School — nav visibility matrix

| Nav item | Route | Owner | Principal | Admin | Acct | Cashier | Exam | Dep | TT | Teacher | CT |
|----------|-------|:-----:|:---------:|:-----:|:----:|:-------:|:----:|:---:|:--:|:-------:|:--:|
| Operations / Registry / My Class / Desk | `/school/dashboard` | ✓ Financial | ✓ Ops | ✓ Registry | | | | | | ✓ Desk | ✓ Class |
| Workflows | `/school/workflows` | ✓ | ✓ | | ✓ | | | | | | |
| Staff | `/school/staff` | ✓ | ✓ | ✓ | | | | | | | |
| Students | `/school/students` | ✓ | ✓ | ✓ | | | | | | | |
| Academic | `/school/academic` | ✓ | ✓ | ✓† | | | | | | | |
| Admissions (under Students) | `.../admissions` | ✓ | ✓ | ✓ | | | | | | | |
| Timetable | `/school/timetable` | † | † | ✓ view | | | | | ✓ | ✓ | ✓ |
| Attendance | `/school/attendance` | ✓ | ✓ | ✓ | | | | | | | ✓ |
| Comms | `/school/comms` | ✓ | ✓ | ✓ | | | ✓ | ✓ | | | ✓ |
| Exams | `/school/exams` | | | | | | ✓ | ✓ | | | |
| Gradebook | `/school/gradebook` | | | | | | ✓ | ✓ | | ✓ | ✓ |
| Report cards | `/school/report-cards` | | | | | | ✓ | ✓ | | ✓ | ✓ |
| Assignments | `/school/assignments` | | | | | | | | | ✓ | ✓ |
| **Ledger: Balances** | `/school/finance/balances` | ✓ | ✓ | | ✓ | | | | | | |
| **Ledger: Refunds** | `/school/finance/refunds` | ✓ | ✓ | | ✓ | ✓ | | | | | |
| **Ledger: Verify** | `.../payments/verify` | | | | ✓ | | | | | | |
| **Ledger: Log** | `.../payments/log` | | | | | ✓ | | | | | |
| **Ledger: Structures** | `/school/finance` | | | | ✓ | | | | | | |
| **Ledger: Reconciliation** | `.../reconciliation` | | | | ✓ | | | | | | |
| **Ledger: PSF** | `/school/finance/psf` | ✓ | | | ✓ | | | | | | |
| Settings › Audit | `/school/settings/audit` | ✓ | ✓ | | | | | | | | |
| Settings | `/school/settings` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

† Owner and Principal: Timetable nav **hidden**; access via Academic hub link “Timetable oversight” only when `timetable.manage` needed.

**Nav labels (required):**

| Role | Dashboard label |
|------|-----------------|
| `school_owner` | Overview |
| `principal` | Operations |
| `admin_officer` | Registry |
| `class_teacher` | My Class |
| `teacher` | My Desk |
| `accountant` | *(no dashboard nav — home is verify)* |
| `cashier` | *(no dashboard nav — home is log)* |

### 5.5 Parent / Student web

**Parent:** Dashboard → Fees → Messages → Attendance → Results → Timetable → Contact  
**Student:** Dashboard → Timetable → Assignments → Results → Messages → Attendance

---

## 6. Home dashboard components (reuse only)

Do **not** create new design patterns. Extend these files:

| Component | File (create or extend) | Roles |
|-----------|-------------------------|-------|
| Registry Dashboard | `admin-officer-dashboard.tsx` | Admin Officer — **done** |
| My Class Dashboard | `class-teacher-dashboard.tsx` | Class Teacher — **done** |
| Teacher Desk | `teacher-landing.tsx` | Teacher — **done** |
| **Financial Command Dashboard** | `school-owner-dashboard.tsx` *(new file, same layout as admin-officer)* | School Owner |
| **Operations Dashboard** | `principal-operations-dashboard.tsx` *(new file, same layout)* | Principal |
| **Finance Ops Dashboard** | Optional embed on verify page hero | Accountant — home is verify queue, not separate dashboard |
| Exam landing | Redirect to `/school/exams` | Exam Officer, Deputy — **done** |

Shared building blocks: `dashboard-primitives`, `workflow-inbox-hero` (metrics only), `StaffVacantRolesBanner`, `AcademicCommandDeck` metrics strip, `QUICK_ACTIONS` grid pattern from admin-officer-dashboard.

### 6.1 School Owner — Financial Command Dashboard (spec)

**See first:** PSF settled vs outstanding, census status for open term, refund approvals waiting on Owner, workflow count.  
**Quick actions:** PSF Obligations, Balances, Workflows, Census lock, Attestations history.  
**No:** gradebook, assignments, timetable builder, payment log.

### 6.2 Principal — Operations Dashboard (spec)

**See first:** Workflow inbox count by type (admissions, refunds, grade fixes, fee amendments, transfers, **staff role changes pending Owner**).  
**Second:** Pending admissions, open term / census due, vacant Exam Officer or Accountant roles.  
**Quick actions:** Workflows, Admissions, Academic, Staff assignments, Broadcast.  
**No:** class-arm filter, enrollment trend placeholder chart, gradebook.

---

## 7. Workflow routing reference

| Workflow type | Initiator | Approver chain (default) | Primary UI |
|---------------|-----------|--------------------------|------------|
| `admission_decision` | Admin (apply) / system | Principal → Owner (optional) | Admissions + Inbox |
| `refund_request` | Cashier | Accountant → Principal → Owner | Inbox + Refunds timeline |
| `grade_correction` | Teacher | Exam Officer → Deputy → Principal | Exams (EO) / Inbox (Principal) |
| `fee_structure_change` | Accountant | Principal → Owner | Inbox only (Principal) |
| `student_transfer_out` | Admin Officer | Principal | Inbox |
| `student_promotion_batch` | Admin (stage) | Principal | Promotions page |
| `held_back_override` | System | Owner | Inbox |
| `student_graduation` | — | Principal (+ Exam optional) | Graduation page |
| `staff_role_change` | Principal | Owner | Staff profile + Inbox |
| `term_closure` | Principal or Owner | **System gate checks only** — then confirming actor closes term (not a multi-approver chain) | Academic sessions |
| `census_lock` | — | MFA step-up (not workflow) | Census lock page |

**Emergency result publish (SRS FR-ACA-008):** Exam Officer unavailable >72h → Deputy activated; if SLA deadline passes without Deputy action, Principal may publish via `/school/exams?section=publish` with step-up MFA. **Only Principal and Exam roles** see publish UI; Principal sees publish **only when server signals emergency escalation active**.

**Backend alignment (required before Phase C item 17):** Current API allows Principal on `POST .../results/publish` unconditionally. Implementation must add an `emergencyEscalationActive` (or equivalent) flag on the publish endpoint response or a dedicated readiness endpoint. UI gates on that flag — unrestricted Principal publish is an **implementation gap**, not a UX requirement.

**Unverified payment escalation (SRS):** Surface on **Owner and Principal Operations/Financial dashboards** as amber banner linking to Accountant verify queue (read-only link for Principal/Owner).

---

## 8. New routes (required)

| Route | Roles | Story | Pattern source | Status |
|-------|-------|-------|----------------|--------|
| `/school/settings/audit` | Owner, Principal | US-AUD-004 | `platform/compliance/audit/page.tsx` | **Ready** — API exists; add `useTenantAuditLogSearch` in api-client + page |
| `/school/academic/attestations` | Owner, Principal | US-REV-002 | Census-lock summary table | **Blocked** — requires list API (see prerequisite below) |

**Tenant audit API:** `GET /tenants/:tenantId/audit/events` — add `useTenantAuditLogSearch` in api-client.

**Attestations prerequisite (Phase C blocker):** No list endpoint exists for `enrollment_attestations` today (INSERT on census lock only). Before UI work:

1. Add contract schema + `GET /tenants/:tenantId/attestations` (or equivalent) in API.
2. Add `useTenantAttestationHistory` in api-client.
3. Then implement `/school/academic/attestations` read-only page.

---

## 9. Existing patterns — mandatory reuse

| Need | Use |
|------|-----|
| KPI / hero strip | `staff-hero.tsx`, `workflow-inbox-hero.tsx`, `finance-*-hero.tsx` |
| Quick actions grid | `QUICK_ACTIONS` in `admin-officer-dashboard.tsx` |
| Approval cards | `WorkflowInboxItemCard` |
| Academic lifecycle | `academic-command-deck.tsx` |
| Finance tables | `outstanding-balances-panel.tsx`, `refund-approval-timeline.tsx` |
| Parent multi-child | `parent/dashboard/page.tsx` |
| Nav role filter | `school-nav-config.ts` + `isNavVisible()` |
| Step-up MFA | `useFinancialMutation` + `StepUpMfaFields` |

**Forbidden:** Parallel component families (`ExecutiveDashboard`, `PrincipalCardV2`, etc.).

---

## 10. User story ownership quick reference

| Epic | Primary roles (UI owner) |
|------|------------------------|
| US-PLT | Platform Owner, Admin |
| US-REG | Regional Manager, Subordinate |
| US-ASM | Owner, Principal, Admin (stage) |
| US-SIS | Admin (manage), Principal/Owner (approve) |
| US-ACA | Teacher, Class Teacher, Exam, Timetable Officer; Principal (approve only) |
| US-FIN | Accountant, Cashier, Parent; Principal/Owner (approve/view) |
| US-COM | Principal/Owner/Admin/Class Teacher (send); Parent (receive) |
| US-PAR | Parent |
| US-STU | Student |
| US-WRK | All approvers via inbox |
| US-AUD | DPO (global), Owner/Principal (tenant) |
| US-REV | Owner (school), Platform (platform) |
| US-REF | Regional + Platform |
| US-HRM | Admin (onboard), Principal (assign + role request), Owner (role finalize) |
| US-XC | All (auth screens) |

---

## 11. Implementation roadmap (ordered)

Future work **must** follow this order. Each phase completes before the next starts.

### Phase A — Foundation (capabilities + nav + homes)

1. Update `capabilities.ts` per §2.2 (`staff.role.request`, `staff.role.assign`, `admissions.approve`, `finance.balances.view`, `ledger.view` for Accountant).
2. Align API authorization: role-change finalize (Owner only), outstanding balances (`finance.balances.view`), PSF read routes (`ledger.view`).
3. Update `route-groups.ts` home paths per §4.
4. Rewrite `school-nav-config.ts` per §5.4 (visibility + labels + ledger sub-items, **Accountant PSF**).
5. Split platform workspace: DPO compliance-only menu.
6. Redirect `/school/finance` by role per §2.4.
7. Hide nav items per §5.4 matrix.

### Phase B — Role dashboards

8. Add `school-owner-dashboard.tsx` + branch in `dashboard/page.tsx`.
9. Add `principal-operations-dashboard.tsx` + branch in `dashboard/page.tsx`.
10. Remove generic dashboard fallback for Owner, Principal, Accountant, Cashier.
11. Add unverified-payment banner to Owner + Principal homes (§7).

### Phase C — Missing story surfaces

11. `/school/settings/audit` + api-client hook.
12. **Attestations API** (contracts → `GET` list endpoint → api-client hook) — **must complete before** `/school/academic/attestations` UI.
13. `/school/academic/attestations` UI (after item 12).
14. Balances export (US-FIN-005).
15. Admission offer letter step (US-SIS-002).
16. Promotion confirm → held-back Owner workflow prompt.
17. Workflow cards: fee amendment diff, transfer context.
18. **Emergency publish backend flag** + Principal publish UI gate on exams publish panel (§7).

### Phase D — Hygiene

19. Remove hardcoded `role === 'principal'|'school_owner'` checks → capabilities.
20. Remove grade-correction duplicate for Principal (Exams nav hidden).
21. Update `docs/loomis-roles-and-logins.md` with home paths and test checklist.

**Definition of done:** Every row in §3 passes manual test at 375px + desktop; no nav link yields 403/permission alert; `pnpm --filter @loomis/web build` clean.

**Sprint execution:** Core defaults in `ROLE_EXPERIENCE_TIER_PLAN.md` (Sprints 1–7); this plan Phases A–D map to Sprints 8–14 in `ROLE_EXPERIENCE_IMPLEMENTATION_ROADMAP.md`.

---

## 12. Governance

- **Feature prompts** must cite role section from §3 and nav row from §5.
- **New screens** require a row in §5 visibility matrix before merge.
- **New workflows** require a row in §7 before merge.
- **Capability changes** require §2.2 table update in same PR.
- **Re-audit trigger:** new epic in `Loomis_User_Stories_v1.md` or new JWT role — run `loomis-role-experience-audit.mdc` for affected roles only, then amend this document.

---

## Appendix A — Approval authority (SoD)

| Action | Actor | Cannot also |
|--------|-------|-------------|
| Verify payment | Accountant | Be Cashier who logged same payment |
| Log payment | Cashier | Verify own payment |
| Approve refund (final) | Owner | Be earlier approver on same chain |
| Change primary role (finalize) | Owner | Be Principal who submitted the same request |
| Initiate staff role change request | Principal | Finalize the same request (Owner only) |
| Approve own admission request | — | N/A (Admin submits, Principal decides) |
| Regional KYC approve | Manager | Approve own subordinate’s KYC |
| PSF override approve | Platform Admin | Same person who submitted |

---

## Appendix B — Document history

| Version | Date | Change |
|---------|------|--------|
| 1.1 | 21 Jun 2026 | Validation review decisions: Principal initiates / Owner finalizes role change (`staff.role.request`); Owner balances approved via `finance.balances.view`; Accountant PSF nav; attestations API prerequisite; emergency publish backend alignment; term closure as gated action |
| 1.1.1 | 21 Jun 2026 | Scope narrowed to Advanced + Enterprise; Core defaults moved to `ROLE_EXPERIENCE_TIER_PLAN.md` |
| 1.0 | 21 Jun 2026 | Initial master plan from platform Role Experience Architecture Review |

---

*End of master plan.*
