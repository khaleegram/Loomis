# Loomis Advanced & Enterprise — QA Matrix (Sprint 14)

Manual sign-off for **Advanced QA** (`advanced` slug) and **Enterprise QA** (`enterprise` slug).  
Password: `LoomisDev2026!` · TOTP secret: `JBSWY3DPEHPK3PXP` (step-up)

Derived from `ROLE_EXPERIENCE_MASTER_PLAN.md` §3 (master role specification).  
Test each school role at **375px** and **desktop**.

---

## Fixture schools

| Tier | Slug | Owner login | Notes |
|------|------|-------------|--------|
| **Advanced** | `advanced` | `owner@advanced.loomis.com` | Seed: split finance, workflows inbox, deputy exam, timetable officer |
| **Enterprise** | `enterprise` | `owner@enterprise.loomis.com` | Platform sets tier; attestations nav, mandatory TOTP step-up |

Re-run `pnpm db:seed` if Advanced/Enterprise accounts are missing.

---

## School roles — Advanced tier

| Role | Login | Login home (master plan §3) | Must verify |
|------|-------|----------------------------|-------------|
| **Owner** | `owner@advanced.loomis.com` | `/school/dashboard` → Financial Command | Workflows inbox; PSF top-level nav; Balances; census; attestations **hidden**; audit export |
| **Principal** | `principal@advanced.loomis.com` | `/school/dashboard` → Operations | Workflows inbox; Admissions; **no** Exams/Gradebook nav; role change request → Owner |
| **Admin Officer** | *(invite on Advanced tenant)* | Registry dashboard | Admissions one-step; Students; **no** Workflows |
| **Accountant** | `accountant@advanced.loomis.com` | `/school/finance/payments/verify` | Verify queue; SoD — cannot verify own logged payment; PSF read; Workflows (refund step) |
| **Cashier** | `cashier@advanced.loomis.com` | `/school/finance/payments/log` | Log payment only; initiate refund; **no** verify |
| **Exam Officer** | `exam@advanced.loomis.com` | `/school/exams` | Publish confirm; corrections section; **no** dashboard nav |
| **Deputy Exam** | `deputy-exam@advanced.loomis.com` | `/school/exams` | Same as EO; banner shows 72h rule when EO active |
| **Timetable Officer** | `timetable@advanced.loomis.com` | `/school/timetable` | Builder home; minimal nav |
| **Teacher** | *(Greenfield or invite)* | Teacher desk | Timetable, gradebook, assignments; no attendance write |
| **Class Teacher** | *(Greenfield or invite)* | My Class | Attendance; class gradebook read-only |

---

## School roles — Enterprise tier (delta)

| Role | Login | Enterprise-only checks |
|------|-------|------------------------|
| **Owner** | `owner@enterprise.loomis.com` | **Attestations** nav → census lock history; TOTP step-up on census lock |
| **Principal** | `principal@enterprise.loomis.com` | Emergency publish **blocked** until EO inactive 120h; then TOTP step-up |
| **Exam Officer** | `exam@enterprise.loomis.com` | Normal publish path; deputy + escalation banners |

Platform activation: **Platform → Tenants → [id] → Experience tier → Enterprise**.

---

## Workflow chains (Advanced+)

| Flow | Steps | Test login path |
|------|-------|-----------------|
| Refund (4-step) | Cashier → Accountant → Principal → Owner | Cashier initiates → inbox each approver |
| Grade correction | Exam Officer → Principal | EO on Exams corrections → Principal inbox |
| Fee amendment | Accountant → Principal → Owner | Accountant proposes → inbox |
| Staff role change | Principal submits → Owner finalizes | Principal staff detail → Owner approve |
| Admission (Owner step) | Principal → Owner (when flag on) | Settings → Experience → owner approval flag |

---

## Advanced paths (smoke)

1. **Owner** — Financial Command dashboard loads; unverified payments banner links to verify queue (read-only)
2. **Principal** — Operations dashboard; open Workflows; approve a pending item
3. **Split finance** — Cashier logs → Accountant verifies (different users)
4. **Optional TOTP** — Settings → Security → enroll; step-up uses authenticator
5. **Audit export** — Settings → Audit → export CSV with filters
6. **Balances export** — Finance → Balances → CSV export

---

## Enterprise paths (smoke)

1. Platform sets tenant to Enterprise
2. Owner → Academic → **Attestations** (empty until census lock)
3. Owner census lock → attestation row appears
4. Principal → Exams → emergency publish gated (banner + API 403)
5. SoD notices on verify queue, refunds, staff role change

---

## Visual quality (Step 4b)

- [ ] Advanced dashboards use hero/KPI pattern (not bare PageHeader shells)
- [ ] Workflows inbox matches finance/academic operational pages
- [ ] Mobile: nav menu scrolls; no clipped CTAs on dashboard cards

---

## Automated gates

```bash
pnpm --filter @loomis/core test
pnpm --filter @loomis/web test -- school-nav-config
pnpm --filter @loomis/web build
```

Nav regression: `apps/web/src/components/school/school-nav-config.regression.test.ts`

---

*Sprint 14 exit — Advanced/Enterprise role experience sign-off.*
