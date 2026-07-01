# DevCareer — First Building Stage Submission (copy-paste)

**Deadline:** Friday, 3 July 2026, 11:59 PM (GMT+1)

Use this when filling the [First Building Stage Submission Form](https://forms.gle/).

---

## Team information

| Field | Value |
|-------|-------|
| Team name | Argalengz |
| Team lead | Mohammed Umar Abdulrahman |
| Team size | Solo |

---

## Project name

**Loomis × Nomba — Per-Student Fee Collection**

---

## One-line summary

Multi-tenant school SaaS that gives every student a dedicated Nomba virtual account so parent bank transfers auto-reconcile to the correct child’s fee balance.

---

## Live demo (login credentials)

**You do not need to run the app locally** — use the live site.

| | |
|---|---|
| **URL** | https://www.loomis.digital/parent/fees |
| **Email** | `parent.jss3b@greenfield.loomis.com` |
| **Password** | `LoomisDev2026!` |

**What to look for:** dedicated student NUBAN card, **₦150** term balance (Nomba sandbox max per transfer), payment history below. Optional second login for staff: `accountant@greenfield.loomis.com` / same password → school payment log.

**Nomba sandbox:** transfer up to **₦150** to the displayed account number to test auto-reconcile (requires webhook signing secret configured on our API host).

---

## Milestones completed (edit before submit)

**Product & infrastructure**

- Selected for Build Phase; hackathon idea approved
- Product spec written and aligned with Loomis finance rules (FIFO invoices, fee credits, PSF settlement)
- Live deployment: https://www.loomis.digital (web) + https://api.loomis.digital (API)
- Public GitHub repo on **`main`** with reviewer docs in `docs/nomba/`

**Nomba integration**

- [x] Nomba OAuth / API authentication working against sandbox
- [x] Per-student virtual account provisioning via Nomba API
- [x] Webhook endpoint receiving `payment_success` events
- [x] Automatic payment settlement (partial, full, overpayment → fee credit)
- [x] Parent portal showing dedicated NUBAN on fees page
- [ ] End-to-end demo: transfer → webhook → updated balance + receipt (pending webhook signing secret on prod)

---

## GitHub repository

```
https://github.com/khaleegram/Loomis
```

**Branch for reviewers:** `main` (production deploy branch; all hackathon work is merged here)

**Start here:** [`docs/nomba/HACKATHON.md`](https://github.com/khaleegram/Loomis/blob/main/docs/nomba/HACKATHON.md)

**Find hackathon-only commits (from 1 July 2026):**

```bash
git log main --since="2026-07-01" --oneline -- \
  docs/nomba \
  apps/api/src/modules/finance/gateway/nomba* \
  apps/api/src/modules/finance/services/virtual-account.service.ts \
  apps/api/src/modules/finance/services/inbound-transfer.service.ts \
  apps/api/src/modules/finance/services/hackathon-demo.service.ts \
  apps/web/src/app/\(parent\)/parent/fees \
  apps/web/src/components/parent/parent-virtual-account-card.tsx \
  apps/web/src/components/parent/parent-hackathon-reset-panel.tsx
```

---

## Supporting links

| Link | Description |
|------|-------------|
| https://github.com/khaleegram/Loomis/tree/main/docs/nomba | Hackathon documentation |
| https://www.loomis.digital/parent/fees | Live parent fees (login above) |
| https://api.loomis.digital/health | API health check |

Optional: add a 2-minute screen recording (Loom / YouTube unlisted) of the happy path.

---

## Notes for reviewers

This is a **full-stack integration** into an existing production school management platform (Loomis), not a standalone payment demo. Nomba code lives primarily in:

- `apps/api/src/modules/finance/gateway/nomba.client.ts`, `nomba.gateway.ts`
- `apps/api/src/modules/finance/services/virtual-account.service.ts`, `inbound-transfer.service.ts`
- `apps/web/src/app/(parent)/parent/fees/` and `apps/web/src/components/parent/parent-virtual-account-card.tsx`

Secrets are not in the repository. Judges can review code on GitHub and test the live demo at loomis.digital without cloning.
