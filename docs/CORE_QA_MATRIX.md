# Loomis Core — QA Matrix (Sprint 7)

Manual sign-off checklist for **Greenfield Academy** (`greenfield` slug, **Core** tier).  
Password: `LoomisDev2026!` · Core SMS dev code: `000000`

Test each role at **375px** and **desktop** unless noted.

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

## Visual quality (Step 4b)

- [ ] No hard black outline cards on students, admissions, settings, audit
- [ ] Gold primary CTAs visible on mobile
- [ ] Tables/lists use `dataPanel` + scroll on narrow viewports

---

## Build gate

```bash
pnpm --filter @loomis/web build
pnpm --filter @loomis/core test
```

---

*Sprint 7 exit — Core MVP sign-off.*
