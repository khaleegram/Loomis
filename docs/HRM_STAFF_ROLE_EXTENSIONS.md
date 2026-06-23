# HRM staff role extensions (multi-role)

**Status:** Shipped (post tier v1 Sprint B)  
**Authority:** `packages/core/src/staff-roles.ts`, `apps/api/src/modules/hrm/services/staff-role-resolver.ts`

---

## Model

| Layer | Rule |
|-------|------|
| **JWT** | Single **primary** role (`users.role`) — unchanged for tier/auth |
| **HRM** | Optional **extension** rows in `hrm.role_assignments` (`assignment_type = 'extension'`) |
| **Allowed extensions** | `teacher`, `class_teacher` only (`STAFF_ROLE_EXTENSIONS`) |
| **Capabilities** | Union across primary + extensions (`effectiveCanForRoles`) |
| **API enforcement** | `requireStaffRole`, `requireCapability` load extensions per request |
| **Auth session** | `staffExtensionRoles[]` on login + refresh (not in JWT) |

Tier plan principle “one primary role per account” still holds: extensions are **additive teaching duties**, not a second login hat.

---

## Examples

| Primary (JWT) | Extension | Effective capabilities |
|---------------|-----------|------------------------|
| `accountant` | `teacher` | Finance desk + gradebook write + timetable view |
| `admin_officer` | `class_teacher` | Registry + attendance mark (CON-003 arm scope) |
| `principal` | — | Leadership only (no extension needed for timetable — has `timetable.manage`) |

Subject assignment auto-grants `teacher` extension when a non-teacher primary receives subjects (`staff.repository`).

---

## Client surfaces

| Surface | Behaviour |
|---------|-----------|
| **Web nav / `useCan`** | `staffExtensionRoles` from session + term-scoped `/teaching/me` union |
| **Mobile** | Primary `accountant` + `teacher` extension → Teacher stack (not “unsupported”) |
| **Staff profile API** | `roleExtensions` on profile response |

Extensions refresh on **login** and **token refresh**. After HRM changes, user should refresh session (or re-login).

---

## Not in scope

- Dual **primary** roles on one account (forbidden)
- Split finance cashier + accountant on one user (SoD — separate invites)
- Optional Advanced roles (`timetable_officer`, `deputy_exam_officer`) — tier flags, not HRM extensions

---

## Verification

```bash
pnpm --filter @loomis/core test -- staff-roles
pnpm --filter @loomis/web test -- school-nav-config
```

Accountant + teacher extension: assign subjects in HRM → extension row → web shows Gradebook nav; mobile opens Teacher tabs after refresh.
