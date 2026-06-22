# Role Experience v1 — Release Notes

**Version:** 1.0 (Sprints 1–14)  
**Date:** June 2026  
**Scope:** Tenant experience tiers (Core, Advanced, Enterprise), school console nav, dashboards, MFA policy, approvals, and pilot readiness.

---

## Summary

Loomis schools now run on one of three **experience tiers**. Core is the default for new tenants. Advanced is self-enabled by the School Owner. Enterprise requires Loomis platform activation.

Backend security (SoD, PSF, RLS, audit) is **never tier-gated**.

---

## Tier capabilities

| Tier | Who enables | Highlights |
|------|-------------|------------|
| **Core** | Default | SMS hybrid MFA, attention-badge approvals, combined finance officer, simple audit log |
| **Advanced** | School Owner | Split finance, Workflow Inbox, role dashboards, optional TOTP, deputy exam, 4-step refunds |
| **Enterprise** | Platform ops | Attestations history, mandatory TOTP step-up, Principal emergency publish escalation, full SoD UI |

---

## Sprint delivery map

| Sprint | Theme |
|--------|--------|
| 1 | Tenant experience spine (`experienceTier`, `financeMode`, flags) |
| 2 | Capabilities, SoD, API integrity |
| 3 | Core nav & finance UX |
| 4 | Core leadership home (attention cards) |
| 5 | Core approvals without workflow inbox |
| 6 | Core MFA (SMS hybrid) |
| 7 | Core audit, onboarding, **Core MVP ship** |
| 8 | Advanced settings & split finance |
| 9 | Advanced nav & Workflow Inbox |
| 10 | Advanced role dashboards |
| 11 | Optional roles & workflow chains |
| 12 | Optional TOTP, audit export, story gaps |
| 13 | Enterprise activation |
| 14 | QA matrices, regression tests, pilot checklist, blockers doc |

---

## Breaking / migration notes

- New tenants default to `experienceTier=core`.
- Existing demo schools: Greenfield (Core), Advanced QA, Enterprise QA — see `docs/loomis-roles-and-logins.md`.
- Nav and home paths depend on tier — do not hardcode `role ===` for finance or workflow visibility; use `useTenantExperience()` and capabilities.

---

## QA sign-off

| Matrix | Path |
|--------|------|
| Core (Greenfield) | `docs/CORE_QA_MATRIX.md` |
| Advanced / Enterprise | `docs/ADVANCED_QA_MATRIX.md` |
| Pilot process | `docs/PILOT_CHECKLIST.md` |
| Known blockers | `docs/KNOWN_BLOCKERS.md` |

---

## Cursor / engineering rules

Tier-aware delivery: `.cursor/rules/loomis-ui-delivery.mdc`  
Role audit workflow: `.cursor/rules/loomis-role-experience-audit.mdc`  
Authority order: `ROLE_EXPERIENCE_TIER_PLAN.md` → `ROLE_EXPERIENCE_MASTER_PLAN.md`

---

## What's next (post v1)

- Sprint 14 pilot: one Core school, optional Advanced school (2 weeks)
- Remaining `// BLOCKED:` integrations (Termii prod, SES prod, push)
- Feature epics outside role experience (per `Loomis_User_Stories_v1.md`)

---

## Audit closure addendum (Phases A–D)

**Date:** June 2026 — closes master plan alignment gaps after Sprints 8–14.

| Deliverable | Detail |
|-------------|--------|
| **Capabilities spine** | `census.lock` + `student.promote.confirm` on Principal; `audit.export` on Owner; Admin loses `finance.balances.view` and `student.graduate` |
| **Nav & homes** | Principal sees Attestations (Enterprise); Teacher home → `/school/dashboard`; platform nav order §5.1 |
| **Phase D hygiene** | `useCanConfirmPromotions`, `useCanExportAudit`, `useCanViewRefunds`, staff role caps replace permission `role ===` |
| **API alignment** | `staff.service`, census preview, audit export use `requireCapability` / `can()` |
| **Workflow dedup** | Fee amendment Advanced → inbox only; §2.3 deep links verified |
| **Coverage matrix** | [`docs/ROLE_EXPERIENCE_COVERAGE_MATRIX.md`](./ROLE_EXPERIENCE_COVERAGE_MATRIX.md) |

**Product decision:** Principal may perform census lock on **all tiers** (master plan §2.2).
