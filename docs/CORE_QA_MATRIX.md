# Loomis Core — QA Matrix (Sprint 14)

Manual sign-off checklist for **Greenfield Academy** (`greenfield` slug, **Core** tier).  
Aligned with `ROLE_EXPERIENCE_TIER_PLAN.md` §3 (Core roles) and Sprint 14 pilot exit criteria.  
Password: `LoomisDev2026!` · Core SMS dev code: `000000`

Test each role at **375px** and **desktop** unless noted.

**Advanced / Enterprise:** see [`ADVANCED_QA_MATRIX.md`](./ADVANCED_QA_MATRIX.md)

---

## School roles (web)

| Role | Login | Home / landing | Must verify |
|------|-------|----------------|-------------|
| **Owner** | `owner@greenfield.loomis.com` | `/school/dashboard` (Core owner home) | Census lock SMS; Settings → Experience (tier, finance mode, admissions toggle); audit log read |
| **Principal** | `principal@greenfield.loomis.com` | `/school/dashboard` (Core principal home) | Attention badges; admissions if toggle on; audit log read |
| **Admin Officer** | `admin@greenfield.loomis.com` | Admin registry dashboard | Register student one-step; Students + Admissions nav; no approve when principal toggle off |
| **Finance** | `accountant@greenfield.loomis.com` | Finance verify desk | Combined finance label; log + verify; refund threshold SMS at ₦100k+ |
| **Exam Officer** | `exam_officer@greenfield.loomis.com` | `/school/exams` | Results publish shell |
| **Teacher** | `teacher01@greenfield.loomis.com` | Timetable / teaching | Password-only login; no attendance write |
| **Class Teacher** | `teacher03@greenfield.loomis.com` | Class teacher dashboard | Attendance for own class |

---

## Parent / student

| Role | Surface | Login | Must verify |
|------|---------|-------|-------------|
| **Parent** | Web `/parent/*` + mobile | `parent.jss3b@greenfield.loomis.com` | Child switcher; fees; SMS on new device / pay |
| **Student** | Web `/parent/*` (student route group) | (seed student portal email from `pnpm db:seed`) | Read-only academics shell |

**Mobile smoke:** `apps/mobile/.maestro/parent-smoke.yaml`

---

## Core paths (Owner / Principal)

1. Login → dashboard attention strip (no Workflows nav on Core)
2. **Students → Registry** — directory loads; mobile toolbar wraps
3. **Students → Admissions** — admin registers student; appears in registry
4. **Settings → Audit log** — events list, date + action filters
5. **Settings → Experience** (Owner) — tier Core, finance one-officer, admissions toggle
6. **Academic → Census lock** (Owner) — SMS step-up

---

## Core pilot exit criteria (Sprint 14)

Complete end-to-end on Greenfield before production pilot sign-off:

| # | Flow | Role | Pass |
|---|------|------|------|
| 1 | Register student (one-step admissions) | Admin Officer | ☐ |
| 2 | Log offline payment | Accountant / Cashier (combined desk) | ☐ |
| 3 | Verify payment (different user than logger) | Accountant | ☐ |
| 4 | Census lock with SMS step-up | School Owner | ☐ |
| 5 | Publish results | Exam Officer | ☐ |
| 6 | Parent pay fees (web or mobile) | Parent | ☐ |

**Nav rule:** Core tenants must **not** see Workflows, PSF top-level nav, Attestations, or Deputy Exam surfaces.

---

## Tier plan §3 — Core personas

| Persona | Role | Core surface |
|---------|------|--------------|
| Owner | `school_owner` | Census, audit, role-change approver, refund ≥ threshold |
| Principal | `principal` | Attention badges (not inbox), routine ops |
| Admin Officer | `admin_officer` | Registry, admissions |
| Finance Officer | `accountant` (+ cashier preset) | Combined log + verify |
| Exam Officer | `exam_officer` | Exams home, publish |
| Teacher / Class Teacher | `teacher`, `class_teacher` | Teaching desk / My Class |
| Parent / Student | `parent`, `student` | Mobile-first portal |

**Core must NOT ship:** Workflow Inbox module, Deputy Exam UI, 4-step refund chain, PSF top-level nav, mandatory TOTP, Timetable Officer UI, Attestation history page.

---

## Visual quality (Step 4b)

- [ ] No hard black outline cards on students, admissions, settings, audit
- [ ] Gold primary CTAs visible on mobile
- [ ] Tables/lists use `dataPanel` + scroll on narrow viewports

---

## Build gate

```bash
pnpm --filter @loomis/web build
pnpm --filter @loomis/web test -- school-nav-config
pnpm --filter @loomis/core test
```

---

*Sprint 14 exit — Core pilot sign-off.*
