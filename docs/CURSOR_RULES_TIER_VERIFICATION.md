# Cursor Rules — Tier & Master Plan Verification (Sprint 14)

Cross-check that `.cursor/rules/` aligns with role experience authority docs.  
**Verified:** Sprint 14 + Audit closure (Phases A–D).

---

## Authority order (must match code)

| Priority | Document | Cursor rule |
|----------|----------|-------------|
| 1 | `ROLE_EXPERIENCE_TIER_PLAN.md` | `loomis-ui-delivery.mdc` Step 0 — Core first |
| 2 | `ROLE_EXPERIENCE_MASTER_PLAN.md` | `loomis-ui-delivery.mdc` + `loomis-role-experience-audit.mdc` |
| 3 | `Loomis_User_Stories_v1.md` | `loomis-ui-delivery.mdc` Step 1 |
| 4 | `packages/core/src/capabilities.ts` | `loomis-roles.mdc`, `loomis-ui-delivery.mdc` Step 2 |
| 5 | API hard rules | `loomis-security.mdc`, `loomis-financial-integrity.mdc` |

---

## Tier gating rules (implementation)

| Rule | Enforced in rules | Enforced in code |
|------|-------------------|------------------|
| Gate nav with `useTenantExperience()` | `loomis-ui-delivery.mdc` | `school-nav-config.ts`, `use-workflow-inbox-module.ts` |
| No `role ===` for permissions | `loomis-ui-delivery.mdc` Step 2 | `useCan` / `requireCapability` (refunds, staff, audit, promotions) |
| Core: no Workflow Inbox module | Tier plan §3 | `workflowsInboxEnabled()`, nav `hideInCore` |
| Enterprise: platform-only tier | Tier plan §8 | `tenant-experience.service.ts` |
| SoD never tier-gated | Tier plan §0 | `loomis-roles.mdc`, API services |
| MFA policy by tier | Tier plan §4 | `packages/core/src/core-mfa-policy.ts` |

---

## Rule files — role experience relevance

| File | Role experience scope |
|------|------------------------|
| `loomis-ui-delivery.mdc` | Primary delivery workflow; Step 4b quality bar |
| `loomis-role-experience-audit.mdc` | Single-role audit sessions (no code until Phase 6.5) |
| `loomis-roles.mdc` | API `requireRole`, hard SoD rules |
| `loomis-implementation-guardrails.mdc` | No silent stubs; BLOCKED surfacing |
| `loomis-mobile-delivery.mdc` | Parent/student mobile stacks |
| `loomis-core.mdc` | Tech stack fixed; module map |

---

## Gaps / follow-ups (post v1)

- `loomis-ui-delivery.mdc` references Sprint 12 Advanced shells — update backlog section when finance mobile ships
- Automated E2E for full pilot matrix — manual QA matrices remain source of truth until Playwright suite exists
- **Census lock:** Principal may lock on all tiers (master plan §2.2); tier-plan “Owner only” note superseded — see [`ROLE_EXPERIENCE_COVERAGE_MATRIX.md`](./ROLE_EXPERIENCE_COVERAGE_MATRIX.md)

---

## Audit closure verification

| Check | Location |
|-------|----------|
| Capability §2.2 alignment | `packages/core/src/capabilities.sprint2.test.ts`, `capabilities.audit-alignment.test.ts` |
| Nav regression | `school-nav-config.regression.test.ts` |
| Dashboard resolver | `school-dashboard-resolver.test.ts` |
| Coverage matrix | `docs/ROLE_EXPERIENCE_COVERAGE_MATRIX.md` |

---

*Engineering sign-off: nav regression tests in `school-nav-config.regression.test.ts`.*
