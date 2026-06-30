# DevCareer — First Building Stage Submission (copy-paste)

**Deadline:** Friday, 3 July 2026, 11:59 PM (GMT+1)

Use this when filling the [First Building Stage Submission Form](https://forms.gle/). Update checkboxes in `HACKATHON.md` before submitting.

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

## Milestones completed (edit before submit)

**Product & infrastructure**

- Selected for Build Phase; hackathon idea approved
- Product spec written and aligned with Loomis finance rules (FIFO invoices, fee credits, PSF settlement)
- Live deployment: https://www.loomis.digital (web) + https://api.loomis.digital (API)
- Public GitHub repo with dedicated hackathon branch and reviewer documentation

**Nomba integration (update as you ship)**

- [ ] Nomba OAuth / API authentication working against sandbox
- [ ] Per-student virtual account provisioning via Nomba API
- [ ] Webhook endpoint receiving `payment_success` events
- [ ] Automatic payment settlement (partial, full, overpayment → fee credit)
- [ ] Parent portal showing dedicated NUBAN on fees page
- [ ] End-to-end demo: transfer → webhook → updated balance + receipt

---

## GitHub repository

```
https://github.com/khaleegram/Loomis
```

**Branch for reviewers:** `hackathon/nomba-virtual-accounts`

**Start here:** `docs/nomba/HACKATHON.md`

---

## Supporting links

| Link | Description |
|------|-------------|
| https://github.com/khaleegram/Loomis/tree/hackathon/nomba-virtual-accounts/docs/nomba | Hackathon documentation |
| https://www.loomis.digital/parent/fees | Live parent fees (demo after UI ships) |
| https://api.loomis.digital/health | API health check |

Optional: add a 2-minute screen recording (Loom / YouTube unlisted) of the happy path.

---

## Notes for reviewers

This is a **full-stack integration** into an existing production school management platform (Loomis), not a standalone payment demo. Nomba code lives primarily in `apps/api/src/modules/finance/` and `apps/web/src/app/(parent)/parent/fees/`. Secrets are not in the repository.
