# DevCareer × Nomba Hackathon 2026 — Reviewer Guide

**Project:** Loomis × Nomba — Per-Student Fee Collection  
**Team:** Argalengz (solo)  
**Repository:** [github.com/khaleegram/Loomis](https://github.com/khaleegram/Loomis)  
**Branch:** `main` (hackathon work is merged here; production deploys from `main`)  
**Build phase:** 1–7 July 2026 · First progress check: **3 July 2026**

---

## One-line summary

Multi-tenant school SaaS that provisions a **persistent Nomba virtual account per student** so parent bank transfers auto-reconcile to the correct child’s fee balance on Loomis.

---

## Problem & Nigerian use case

Nigerian private schools collect most term fees via **bank transfer**. Money often lands in one generic school account — bursars must manually match transfers to students. Loomis already manages invoices, receipts, and parent portals; this hackathon adds **Nomba virtual accounts (NUBANs)** so each student has a dedicated account number and inbound transfers settle automatically via webhooks.

---

## Live URLs

| Service | URL |
|---------|-----|
| Web app | https://www.loomis.digital |
| Parent fees | https://www.loomis.digital/parent/fees |
| API health | https://api.loomis.digital/health |
| Nomba webhook | `POST https://api.loomis.digital/api/v1/webhooks/nomba` |

---

## Demo credentials (Greenfield Academy)

**Live demo:** https://www.loomis.digital/parent/fees

Password for all seeded dev users: `LoomisDev2026!`

| Role | Email | What to show |
|------|-------|--------------|
| **Parent** | `parent.jss3b@greenfield.loomis.com` | Dedicated NUBAN, **₦150** fee balance, payment history, hackathon reset panel |
| **Accountant** | `accountant@greenfield.loomis.com` | Verified Nomba transfers in payment log |

Full role list: [`docs/loomis-roles-and-logins.md`](../loomis-roles-and-logins.md)

**Nomba sandbox limits:** max **₦150** per transfer, max **2** virtual accounts per sandbox user. Demo amounts are scaled accordingly.

---

## Reviewing hackathon code on GitHub

Judges **do not need to clone or run locally** — test on loomis.digital (credentials above) and browse code on `main`.

| Path | Description |
|------|-------------|
| `docs/nomba/` | All hackathon documentation |
| `apps/api/src/modules/finance/gateway/nomba.client.ts` | Nomba auth, VA API, webhook HMAC |
| `apps/api/src/modules/finance/gateway/nomba.gateway.ts` | Gateway adapter |
| `apps/api/src/modules/finance/services/virtual-account.service.ts` | Provision per-student VA |
| `apps/api/src/modules/finance/services/inbound-transfer.service.ts` | Webhook → settlement |
| `apps/api/src/modules/finance/services/hackathon-demo.service.ts` | Demo balance reset (₦150) |
| `apps/api/drizzle/migrations/0062_student_virtual_accounts_nomba.sql` | VA table migration |
| `apps/web/src/app/(parent)/parent/fees/` | Parent fees page |
| `apps/web/src/components/parent/parent-virtual-account-card.tsx` | NUBAN card UI |
| `packages/contracts/src/finance/finance.schema.ts` | Parent VA + fee response types |

```bash
git log main --since="2026-07-01" --oneline -- docs/nomba apps/api/src/modules/finance/gateway/nomba*
```

---

## Architecture (high level)

```
Parent transfers to student NUBAN (any Nigerian bank)
        ↓
Nomba → POST /api/v1/webhooks/nomba (payment_success)
        ↓
Verify HMAC → idempotent webhook store
        ↓
Resolve student from accountRef
        ↓
FIFO apply to open invoices; surplus → student_fee_credits
        ↓
payment.verified → receipt + parent notification + PSF settlement
```

---

## Milestones

### Completed (pre / early build)

- [x] Hackathon idea selected — Build Phase
- [x] Product specification (`docs/nomba/`)
- [x] Production platform deployed (loomis.digital)
- [x] Public GitHub repository on `main` with `docs/nomba/` reviewer guide
- [x] Nomba sandbox credentials issued; webhook URL registered
- [x] Existing finance engine: FIFO allocation, fee credits, webhook idempotency (Paystack)

### Build phase (target 3 July)

- [x] Nomba gateway adapter (auth + create virtual account)
- [x] `student_virtual_accounts` persistence + provision on student
- [x] Inbound transfer settlement (under / over / pay-ahead)
- [x] Parent fees UI — dedicated NUBAN
- [ ] End-to-end sandbox demo on loomis.digital (transfer → webhook → balance; needs webhook signing secret on prod)

### Stretch (final submission)

- [ ] Duplicate webhook demo (replay same event — no double credit)
- [ ] Parent notification on partial payment
- [ ] Accountant reconciliation exception for unknown `accountRef`

---

## Local development

```bash
pnpm install
pnpm db:up
cp .env.example .env.local
# Fill NOMBA_* sandbox vars (see .env.example) — never commit real keys
pnpm --filter @loomis/api db:migrate
pnpm db:seed
pnpm dev
```

API: `http://localhost:18080` · Web: `http://localhost:3000`

For Nomba webhooks locally, use a tunnel (ngrok) pointing to `/api/v1/webhooks/nomba`.

---

## Environment variables (Nomba)

Set on the API host only (Railway). **Never commit real values.**

| Variable | Purpose |
|----------|---------|
| `NOMBA_BASE_URL` | `https://sandbox.nomba.com` (test) or `https://api.nomba.com` (live) |
| `NOMBA_CLIENT_ID` | From Nomba hackathon email (use **TEST** for sandbox) |
| `NOMBA_PRIVATE_KEY` | From Nomba hackathon email |
| `NOMBA_PARENT_ACCOUNT_ID` | Parent account ID (`accountId` header) |
| `NOMBA_SUB_ACCOUNT_ID` | Your sub-account scope |
| `NOMBA_WEBHOOK_SECRET` | Signature key from Nomba webhook setup |

See root `.env.example` for the full list.

---

## Security

- API keys live in environment variables only (`.gitignore` blocks `.env*`)
- Webhook signature verified **before** any balance mutation
- Tenant isolation via PostgreSQL RLS on all finance tables
- Idempotency on `(provider, provider_event_id)` prevents double-crediting

---

## Commit history

Reviewers: hackathon work is on **`main`**. Filter from **1 July 2026**:

```bash
git log main --since="2026-07-01" --oneline -- docs/nomba apps/api/src/modules/finance/gateway/nomba*
```

Or browse [`docs/nomba/HACKATHON.md`](./HACKATHON.md#reviewing-hackathon-code-on-github) for the full file list.

---

## Contact

Questions during build phase: DevCareer Slack `#nomba-hackathon`
