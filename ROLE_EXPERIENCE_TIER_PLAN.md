# Loomis — Role Experience Tier Plan

**Status:** Authoritative for **Core** tenant UX defaults and feature toggles.  
**Version:** 1.0  
**Date:** 21 June 2026  
**Companion:** `ROLE_EXPERIENCE_MASTER_PLAN.md` v1.1 (Advanced + Enterprise reference)

---

## Document hierarchy

```
ROLE_EXPERIENCE_TIER_PLAN.md     →  Core defaults + tier toggles (this document)
        ↓
ROLE_EXPERIENCE_MASTER_PLAN.md   →  Advanced + Enterprise full role UX (when flags on)
        ↓
Loomis_User_Stories_v1.md        →  Story acceptance criteria
Loomis_SRS_v3.md                 →  Non-negotiable server/security rules
```

**For Core tenants, this tier plan takes precedence over the master plan for UI, navigation, and approval friction.**

**The master plan applies when Advanced or Enterprise features are enabled** for that tenant (or feature flag).

**Backend integrity is never tier-gated.** Core schools get the same PSF pipeline, audit writes, payment SoD, tenant isolation, and role tracking as Enterprise — only surfaces and friction differ.

---

## 0. Principles

1. **Tier by complexity, not price** — until usage data links features to willingness to pay.
2. **Split in the DB, merge in the UI** — roles and capabilities stay granular; onboarding chooses what schools see.
3. **One primary role per staff account** — combined jobs use **capability presets**, not dual JWT roles on one login.
4. **Split mode requires a second invite** — one person cannot hold both sides of a SoD split in split mode.
5. **10-staff / WhatsApp test** — before adding a role, screen, approval step, or security gate: *would a small Nigerian school use it or work around it?* If workaround, default off (Advanced/Enterprise).

---

## 1. Tier model

| Tier | Default | Who enables | Scope |
|------|---------|-------------|-------|
| **Core** | Yes — every new tenant | Automatic at provisioning | School + parent/student UX |
| **Advanced** | Off | **School Owner** self-service | Optional splits, workflows, MFA options |
| **Enterprise** | Off | **Loomis team** (activation review) | Full master-plan controls, deputies, mandatory step-up |

**Storage:** `tenant.experienceTier` (`core` \| `advanced` \| `enterprise`) **plus** per-feature flags where needed (e.g. `finance.mode`, `timetable.dedicatedOfficer`).

**Enterprise is opt-in by need, not student count.** A 150-student school may enable Enterprise; a 2,000-student school may stay Core.

**Platform features are never school-tier gated:**

| Feature | Layer |
|---------|--------|
| DPO console | Platform |
| Regional Manager / Subordinate | Platform |
| Platform ledger, PSF rate controls | Platform |
| IVP cases | Platform |
| Referral admin | Platform |
| Break-glass support | Platform |

School tier affects only `/school/*`, `/parent/*`, and mobile teaching/parent/student stacks.

---

## 2. Combined roles — DB vs UI (Option A + B)

Roles remain distinct in the database and capability model. UI uses **friendly labels** and **presets**.

### 2.1 Finance

**Onboarding question:**

```text
How do you manage payments?

○ One finance officer
○ Separate cashier and accountant
```

#### Combined mode (`finance.mode = combined`) — Core default

- **UI label:** Finance Officer (not Accountant/Cashier).
- **Single account** receives preset capabilities:
  - `payment.log`
  - `payment.verify`
  - `refund.initiate`
  - `fee.configure`
  - `finance.balances.view`
- **Primary role in JWT:** typically `accountant` (implementation choice); cashier role unused until split.
- Internal capability map unchanged — Loomis still knows Accountant vs Cashier semantics for when split is enabled.

#### Split mode (`finance.mode = split`) — Advanced toggle

- School Owner enables split finance in settings.
- **Must invite two separate people:**
  - one `cashier` (`payment.log`, `refund.initiate`)
  - one `accountant` (`payment.verify`, `fee.configure`, `finance.balances.view`, `ledger.view` for PSF read)
- **Same person MUST NOT hold both roles in split mode.** Enforce at invite/assignment — split mode is meaningless otherwise.
- UI shows Accountant and Cashier nav labels per master plan §5.4.

### 2.2 Timetable

| Tier | Timetable |
|------|-----------|
| **Core** | No Timetable Officer UI. Timetable managed by **Teacher** (own schedule context) or **Principal** (school builder access via academic link). |
| **Advanced** | Toggle `timetable.dedicatedOfficer` → invite **Timetable Officer**; full builder UX per master plan. |

### 2.3 Exams

| Tier | Exam |
|------|------|
| **Core** | **Exam Officer** visible and required (results publish is universal). |
| **Advanced** | Optional **Deputy Exam Officer** invite + 72h automation (master plan §3.11, §7). |
| **Enterprise** | Emergency Principal publish escalation UI + backend flag (master plan §7). |

---

## 3. Core roles (default school surface)

| Persona | Underlying role(s) | Core notes |
|---------|-------------------|------------|
| Owner | `school_owner` | Census lock required; role-change approver; refund above threshold |
| Principal | `principal` | Direct authority on routine ops; attention badges not Workflow Inbox |
| Admin Officer | `admin_officer` | Registry, admissions |
| Finance Officer | preset on `accountant` | Combined finance preset |
| Exam Officer | `exam_officer` | Core — not optional |
| Teacher | `teacher` | |
| Class Teacher | `class_teacher` | |
| Parent / Student | `parent`, `student` | Mobile-first |

**Core always ships:** audit log (simple trail), exam officer, class teacher split, parent/student mobile, finance officer UX, payment tracking, census lock, role tracking.

**Core must NOT ship:**

1. Workflow Inbox **module** (use home attention badges + inline approve)
2. Deputy Exam Officer UI
3. 4-step refund chain
4. Separate PSF top-level nav (PSF section inside Finance/Balances)
5. Mandatory TOTP MFA
6. Timetable Officer role UI
7. Attestation history page (Enterprise / blocked on API anyway)

---

## 4. Core MFA policy (Hybrid D)

Core UX **intentionally softens SRS MFA friction** while retaining backend protections: rate limiting, session revocation, device tracking, lockouts, audit.

Document for compliance/product:

> Core UX simplifies MFA presentation. Server-side security controls remain enforced.

### 4.1 By actor

| Actor | Core login | Notes |
|-------|------------|-------|
| **Owner, Principal, Finance Officer** | Password + **SMS OTP on first login** + **trusted device 30 days** | After trust: password only for routine use |
| **Teachers, Class Teachers** | Password only | |
| **Parents** | Password only | OTP on: fee payment, password reset, new device login |
| **Students** | Password only | |

### 4.2 Step-up (SMS unless Advanced enables TOTP)

| Action | Core friction |
|--------|----------------|
| **Census lock** | **SMS OTP always** (few times per year — acceptable) |
| **Refund approve** | SMS OTP **above threshold** (default ₦100,000 — configurable) |
| **Result publish** | Exam Officer: confirm dialog Core; TOTP optional Advanced |
| **Data export** | SMS OTP Advanced+ |

### 4.3 Trusted device

- **Yes — 30 days** after successful SMS OTP.
- Explicit logout or device deregister clears trust.

### 4.4 Advanced / Enterprise

- School may enable **authenticator TOTP** (optional Advanced).
- **Enterprise:** mandatory step-up TOTP per master plan / SRS for high-risk actions.

---

## 5. Core approval matrix

Avoid workflow-engine ceremony in Core. Use **notifications + one-tap approve** where Owner is required.

| Action | Core approver | Notes |
|--------|---------------|-------|
| Admission | **Principal alone** | |
| Publish results | **Exam Officer** | |
| Promotions confirm | **Principal** | Held-back override: inline on promotion screen (checkbox + reason), not separate workflow type |
| Staff deactivation | **Principal** | Singleton-role warning kept |
| Fee structure change | **Principal** | Accountant/Finance Officer proposes |
| Refund below ₦50,000 | **Principal** | Default; configurable |
| Refund above ₦50,000 | **Owner** | Default; configurable |
| Refund (single approver mode) | **Principal** | Owner can override default in settings |
| **Census lock** | **Owner required** | Always — affects PSF billing |
| **Staff role change** | **Owner required** | Principal submits change → Owner notification → **one-tap approve** — no Workflow Inbox module |

### 5.1 Same-person collapse

If Owner and Principal are the **same account** (or same person with both hats configured as one login):

- **One approval only** — never double-approve self.

Implementation: detect actor holds both approver hats on the same `userId` and skip second step.

### 5.2 Advanced / Enterprise

Multi-step chains (e.g. Cashier → Accountant → Principal → Owner refunds) activate per master plan §7 when `tenant.experienceTier >= advanced` and workflow flags enabled.

---

## 6. Core UX simplifications (vs master plan v1.1)

| Master plan item | Core treatment |
|------------------|----------------|
| `finance.balances.view`, `ledger.view`, `fee.configure` | Bundled into **Finance Officer** preset — no capability toggles in school admin UI |
| PSF Obligations nav | **Section** on Balances/Finance summary — not top-level nav |
| Six workspace-type taxonomy | Internal design hint only — not user-facing |
| Held-back override | Inline on promotion confirm — not Owner-only workflow inbox |
| Workflows nav | **Hidden** — attention badges on Owner/Principal home |
| Principal role change | Request + Owner one-tap — not master plan inbox-only chain in Core |
| Audit log | **Core** — simple "who did what, when" (dispute resolution framing) |
| Audit export / advanced filters | **Advanced** |

---

## 7. Advanced feature toggles (Owner self-service)

| Toggle | Enables |
|--------|---------|
| Split finance | Separate Cashier + Accountant invites (SoD enforced) |
| Dedicated Timetable Officer | Timetable Officer role + nav |
| Deputy Exam Officer | Second exam login + 72h rules |
| Multi-step approvals | Workflow Inbox module + longer chains |
| Optional TOTP MFA | Authenticator app for staff |
| Audit export / advanced search | Enhanced audit UI |

---

## 8. Enterprise (Loomis team activation)

Requires Loomis ops approval (support burden).

| Feature | Reference |
|---------|-----------|
| Full master plan nav matrix §5.4 | `ROLE_EXPERIENCE_MASTER_PLAN.md` |
| 4-step refund chains | Master plan §7 |
| Emergency publish escalation + backend flag | Master plan §7 |
| Mandatory step-up TOTP | SRS SEC-AUTH-008 |
| Attestation history page | Master plan §8 (after list API) |
| Hard SoD enforcement UI | Master plan Appendix A |
| Full workflow engine for all action types | Master plan §2.3, §7 |
| Regional / multi-branch school controls | Product-defined |

---

## 9. Governance for implementation

### 9.1 Default

- **New tenant = Core only.**
- Implement Core from **this document** first.
- Implement master plan paths only when `tenant.experienceTier` and feature flags warrant it.

### 9.2 Authority order (Core tenant)

1. **`ROLE_EXPERIENCE_TIER_PLAN.md`** (this document)
2. `ROLE_EXPERIENCE_MASTER_PLAN.md` — only for enabled Advanced/Enterprise features
3. `Loomis_User_Stories_v1.md` + `Loomis_SRS_v3.md` — stories + **server** rules
4. `packages/core/src/capabilities.ts` + API enforcement

### 9.3 Before adding complexity

Apply the **10-staff / WhatsApp test** (§0). Default new friction to Advanced or Enterprise.

### 9.4 Tier changes

| Tier | Who can enable |
|------|----------------|
| Advanced | School Owner (settings) |
| Enterprise | Loomis team only |

**Execution sprints:** see `ROLE_EXPERIENCE_IMPLEMENTATION_ROADMAP.md` (Sprints 1–14).

---

## 10. Implementation checklist (Core MVP)

**Tenant config**

- [ ] `tenant.experienceTier` default `core`
- [ ] `tenant.financeMode`: `combined` \| `split`
- [ ] Feature flags for Advanced toggles

**Onboarding**

- [ ] Finance one-officer vs split question
- [ ] Apply finance capability preset

**Auth**

- [ ] SMS OTP + 30-day trusted device (Owner/Principal/Finance)
- [ ] Census lock SMS OTP
- [ ] Refund threshold SMS OTP

**UX**

- [ ] Finance Officer label (combined mode)
- [x] Home attention badges (no Workflows nav)
- [ ] Owner one-tap role-change approval
- [ ] PSF as section under finance/balances
- [ ] Simple audit log view

**API (always on, all tiers)**

- [ ] Cashier cannot verify own payment (even in combined mode — use actor id check)
- [ ] PSF at census lock
- [ ] Audit writes on sensitive actions

---

## Appendix A — Locked product decisions (21 Jun 2026)

| Topic | Decision |
|-------|----------|
| Combined finance | Option A + B; split = second invite; no dual hat in split mode |
| Core MFA | Hybrid D; softer than SRS UX; backend protections remain |
| Census lock | Owner required |
| Role change | Owner one-tap approve; not workflow inbox in Core |
| Refund thresholds | ₦50k Principal / above Owner (defaults, configurable) |
| Same-person collapse | Yes |
| Enterprise | Opt-in, not size-based |
| Platform features | Never school-tier gated |
| Docs | Tier plan + master plan; v1.1 not replaced |

---

*End of tier plan.*
