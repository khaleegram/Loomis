# DevCareer × Nomba Hackathon 2026 — Reviewer Guide

**Project:** Loomis × Nomba — Per-Student Fee Collection  
**Team:** Argalengz (solo)  
**Repository:** [github.com/khaleegram/Loomis](https://github.com/khaleegram/Loomis)  
**Branch:** `hackathon/nomba-virtual-accounts`  
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

Password for all seeded dev users: `LoomisDev2026!`

| Role | Email | What to show |
|------|-------|--------------|
| **Parent** | `parent.jss3b@greenfield.loomis.com` | Dedicated NUBAN, fee balance, payment history |
| **Accountant** | `accountant@greenfield.loomis.com` | Verified Nomba transfers in payment log |

Full role list: [`docs/loomis-roles-and-logins.md`](../loomis-roles-and-logins.md)

**Nomba sandbox limits:** max **₦150** per transfer, max **2** virtual accounts per sandbox user. Demo amounts are scaled accordingly.

---

## Where the Nomba work lives

Implementation is integrated into the existing Loomis monorepo (not a separate toy repo).

### Documentation

| Path | Description |
|------|-------------|
| `docs/nomba/per-student-virtual-accounts.md` | Full product spec — happy path + unhappy paths |
| `docs/nomba/HACKATHON.md` | This file |
| `docs/nomba/SUBMISSION.md` | Form copy for DevCareer |

### Backend (finance module)

| Path | Status | Description |
|------|--------|-------------|
| `apps/api/src/modules/finance/gateway/nomba.gateway.ts` | 🚧 Build phase | Nomba auth, VA create, webhook verify/parse |
| `apps/api/src/modules/finance/gateway/index.ts` | 🚧 | Register `nomba` in gateway abstraction layer |
| `apps/api/src/modules/finance/services/virtual-account.service.ts` | 🚧 | Provision per-student VA, resolve `accountRef` |
| `apps/api/src/modules/finance/services/inbound-transfer.service.ts` | 🚧 | Webhook → FIFO invoice allocation + fee credits |
| `apps/api/src/modules/finance/handlers/webhook.handler.ts` | ✅ Exists | Provider-param webhook route |
| `apps/api/src/modules/finance/services/webhook.service.ts` | ✅ Exists | HMAC verify, idempotent `webhook_events` upsert |
| `apps/api/drizzle/schema/finance.ts` | 🚧 | `student_virtual_accounts` table (planned) |
| `apps/api/src/config/env.ts` | 🚧 | `NOMBA_*` env validation |

### Shared contracts & client

| Path | Status | Description |
|------|--------|-------------|
| `packages/contracts/src/finance/finance.schema.ts` | 🚧 | Add `nomba` provider + VA response types |
| `packages/api-client/src/query/hooks/finance.ts` | 🚧 | Parent VA fetch hook |

### Frontend

| Path | Status | Description |
|------|--------|-------------|
| `apps/web/src/app/(parent)/parent/fees/page.tsx` | 🚧 | Dedicated NUBAN card + fee credit strip |

### Existing Loomis primitives reused

| Feature | Path / table |
|---------|----------------|
| FIFO invoice allocation | `payment-allocation.utils.ts` |
| Pay-ahead / overpayment surplus | `student_fee_credits` table |
| Webhook idempotency | `finance.webhook_events` unique `(provider, provider_event_id)` |
| PSF settlement on verify | `payment.verified` → ledger pipeline |

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
- [x] Public GitHub repository + hackathon branch
- [x] Nomba sandbox credentials issued; webhook URL registered
- [x] Existing finance engine: FIFO allocation, fee credits, webhook idempotency (Paystack)

### In progress (build phase — target 3 July)

- [ ] Nomba gateway adapter (auth + create virtual account)
- [ ] `student_virtual_accounts` persistence + provision on student
- [ ] Inbound transfer settlement (under / over / pay-ahead)
- [ ] Parent fees UI — show dedicated NUBAN
- [ ] End-to-end sandbox demo on loomis.digital
- [ ] `HACKATHON.md` file map updated to ✅

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

Reviewers: filter commits on branch `hackathon/nomba-virtual-accounts` from **1 July 2026** onward for hackathon-specific work.

```bash
git log hackathon/nomba-virtual-accounts --since="2026-07-01" --oneline
```

---

## Contact

Questions during build phase: DevCareer Slack `#nomba-hackathon`
