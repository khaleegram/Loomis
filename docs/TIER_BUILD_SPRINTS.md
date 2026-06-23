# Tier build sprints (post v1 audit)

**Status:** Sprints A–D complete (June 2026)  
**Context:** Follow-up work after Sprints 1–14 shipped tier infrastructure but left doc/code gaps vs `ROLE_EXPERIENCE_TIER_PLAN.md`.

| Sprint | Theme | Outcome |
|--------|--------|---------|
| **A** | Core tier integrity | Greenfield seed without TO/Deputy; nav + API gates; census lock docs reconciled |
| **B** | Multi-role HRM | `staffExtensionRoles` on auth; web/mobile effective roles; `HRM_STAFF_ROLE_EXTENSIONS.md` |
| **C** | Term closure & transfers | Real closure gate + preview API; transfer pendingApproval UX; held-back Core/Advanced banners |
| **D** | Hygiene & pilot readiness | Missing error codes; workflow deep links; regression tests; mobile unsupported copy |

---

## Sprint D detail

### Error codes (contracts + UI)

Registered in `packages/contracts/src/common/errors.ts`:

- `HRM_ROLE_NOT_ENABLED` — optional staff roles blocked on Core without Advanced flags
- `ACADEMIC_HELD_BACK_APPROVAL_PENDING` — promotion confirm blocked pending owner workflow
- `EXAM_EMERGENCY_PUBLISH_INACTIVE`, `EXAM_DEPUTY_DISABLED`, `EXAM_DEPUTY_NOT_ACTIVATED`

User-facing copy: `academic-errors.ts`, `app-error-message.ts`.

### Workflow deep links

`apps/web/src/lib/workflow/workflow-context-link.ts` — canonical href per workflow type (§2.3):

- Transfer → student profile
- Held-back → student profile (fallback: promotions)
- Grade correction → exams corrections section

Used by Advanced inbox cards and Core inline approval cards.

### Tests

```bash
pnpm --filter @loomis/api exec vitest run src/modules/academic/services/term-closure-gate.test.ts
pnpm --filter @loomis/web test -- workflow-context-link school-nav-config
pnpm --filter @loomis/core test -- staff-roles
```

### Still ops / env (not code)

- Live 2-week pilot — `docs/PILOT_CHECKLIST.md`
- Termii/SES prod — `docs/KNOWN_BLOCKERS.md`
- Playwright E2E for full matrix

---

## Verification after any tier build change

1. Re-seed Greenfield: `pnpm db:seed` (requires Docker + DB)
2. Core login paths — `docs/loomis-roles-and-logins.md`
3. Nav regression — `school-nav-config.regression.test.ts`
4. Coverage matrix — `docs/ROLE_EXPERIENCE_COVERAGE_MATRIX.md`
