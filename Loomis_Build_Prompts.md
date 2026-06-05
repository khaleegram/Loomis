# Loomis — Build Prompts Playbook

Copy-paste prompts to build Loomis end to end (backend + web + mobile) across focused chats.
Each block = one new Agent chat. Work top to bottom. Commit at the end of every chat, then open a fresh one.

---

## How to Use This Playbook

- **One chat per block.** Open a new Agent chat, paste the block, let it work, commit, close.
- **Your always-on rules load automatically** (core, security, financial-integrity, roles, guardrails), so prompts stay short on purpose. Glob rules (database, api, module-patterns, frontend) auto-attach when you touch matching files.
- **Commit between chats** so the next chat trusts committed code instead of re-reading everything.
- **Blocked = stop and ask.** Per the guardrails rule, the agent will pause and request any missing credential/key instead of mocking or substituting. When you see a `// BLOCKED` note, that's expected — provide the value and resume.
- **Don't merge blocks.** Combining chats bloats context and burns tokens; the whole point is small, scoped sessions.

### Which Model to Use (exact)

Set the model in Cursor's model picker **before** pasting each block. Don't leave high-stakes blocks on Auto.

| Tier | Exact model | Use for |
|------|-------------|---------|
| **Heavy** | `claude-opus-4-8-thinking-high` | Financial, security, and offline-sync correctness — bugs here are costly |
| **Balanced** | `claude-4.6-sonnet-medium-thinking` | Module CRUD with business rules, UI screens (Auto is acceptable here) |
| **Fast** | `composer-2.5-fast` | Scaffolding, wiring, repetitive screens, small fixes |

Each chat heading below carries its `Model:` line. Master mapping for quick reference:

| Chat | Model | Chat | Model |
|------|-------|------|-------|
| 0 Bootstrap | `composer-2.5-fast` | 20 api-client core/refresh | `claude-opus-4-8-thinking-high` |
| 1A Identity data | `claude-opus-4-8-thinking-high` | 21 api-client query/mutation | `claude-4.6-sonnet-medium-thinking` |
| 1B Identity auth | `claude-opus-4-8-thinking-high` | 22 Web init | `composer-2.5-fast` |
| 1C Identity mw/tests | `claude-opus-4-8-thinking-high` | 23 Web BFF auth | `claude-opus-4-8-thinking-high` |
| 2 Tenant | `claude-4.6-sonnet-medium-thinking` | 24 Web school shell | `claude-4.6-sonnet-medium-thinking` |
| 3 HRM | `claude-4.6-sonnet-medium-thinking` | 25 Web academic/census | `claude-4.6-sonnet-medium-thinking` |
| 4 Academic Session | `claude-opus-4-8-thinking-high` | 26 Web students | `claude-4.6-sonnet-medium-thinking` |
| 5 Student | `claude-4.6-sonnet-medium-thinking` | 27 Web academic ops | `claude-4.6-sonnet-medium-thinking` |
| 6 Workflow | `claude-4.6-sonnet-medium-thinking` | 28 Web finance | `claude-4.6-sonnet-medium-thinking` |
| 7 Storage | `claude-4.6-sonnet-medium-thinking` | 29 Web platform console | `claude-4.6-sonnet-medium-thinking` |
| 8 Gradebook | `claude-4.6-sonnet-medium-thinking` | 30 Web regional/compliance | `claude-4.6-sonnet-medium-thinking` |
| 9 Attendance/timetable | `claude-4.6-sonnet-medium-thinking` | 31 Mobile init | `composer-2.5-fast` |
| 10 Fees | `claude-4.6-sonnet-medium-thinking` | 32 Mobile offline engine | `claude-opus-4-8-thinking-high` |
| 11 Payments | `claude-opus-4-8-thinking-high` | 33 Mobile auth/biometrics | `claude-opus-4-8-thinking-high` |
| 12 Refunds | `claude-opus-4-8-thinking-high` | 34 Mobile class-teacher | `claude-4.6-sonnet-medium-thinking` |
| 13 Ledger | `claude-opus-4-8-thinking-high` | 35 Mobile teacher | `claude-4.6-sonnet-medium-thinking` |
| 14 PSF pipeline | `claude-opus-4-8-thinking-high` | 36 Mobile parent | `claude-4.6-sonnet-medium-thinking` |
| 15 Risk/IVP | `claude-opus-4-8-thinking-high` | 37 Mobile student/push | `claude-4.6-sonnet-medium-thinking` |
| 16 Referral | `claude-4.6-sonnet-medium-thinking` | 38 E2E web | `claude-4.6-sonnet-medium-thinking` |
| 17 Comms | `claude-4.6-sonnet-medium-thinking` | 39 E2E mobile | `claude-4.6-sonnet-medium-thinking` |
| 18 Compliance | `claude-4.6-sonnet-medium-thinking` | 40 Pre-launch security | `claude-opus-4-8-thinking-high` |
| 19 Audit hardening | `claude-opus-4-8-thinking-high` | | |

> If a Balanced block starts producing subtly wrong financial or security logic, bump it to `claude-opus-4-8-thinking-high` and retry. If a model in the picker is named slightly differently, match by family (Opus-high-thinking / Sonnet-medium-thinking / Composer-fast).

### Build Order (high level)

```
Backend Phase 1 (Foundation)  ─► Shared api-client ─► Web foundation + auth
        │                                                      │
        ▼                                                      ▼
Backend Phase 2 (Operations) ───────────────────────► Web school console
        │                                                      │
        ▼                                                      ▼
Backend Phase 3 (Revenue Integrity) ─────────────────► Web platform/regional console
        │
        ▼
Backend Phase 4 (Ecosystem) ─► Mobile foundation ─► Mobile role apps
        │
        ▼
Backend Phase 5 (Compliance) ─► Hardening + E2E + release
```

You can start the Web track as soon as the Identity backend (Chat 1C) is done. Mobile track starts after Phase 2 operations exist (attendance/gradebook are its flagship offline features).

---

## CREDENTIALS CHECKLIST (what you must provide, and when)

The agent will stop and ask for these at the right time. Have them ready so you're not blocked.

| When | Needed | Env var(s) | How to get |
|------|--------|-----------|-----------|
| Chat 0 | RS256 keypair | `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | `openssl` (agent gives commands) |
| Chat 0 | TOTP + refresh secrets | `TOTP_ENCRYPTION_KEY`, `REFRESH_TOKEN_HMAC_SECRET` | random 32-byte strings |
| Chat 0 | Postgres + Redis | `DATABASE_URL`, `REDIS_URL` | `pnpm db:up` |
| Phase 2 (HRM/Student notifications) | Email | SES creds (or Mailpit locally) | AWS SES console / Mailpit is already in docker-compose |
| Phase 2 (OTP delivery) | SMS | `TERMII_API_KEY` | Termii dashboard |
| Phase 2 (Finance) | Payment gateways | `PAYSTACK_SECRET_KEY` + webhook secret, etc. | Paystack/Flutterwave sandbox |
| Phase 2 (Storage) | File storage | `S3_BUCKET`, `S3_REGION`, AWS keys | AWS S3 (or approve a documented local alternative) |
| Mobile push | FCM + APNs | FCM server key, APNs key/cert | Firebase console / Apple Developer |
| Production | AWS infra | KMS keys, Secrets Manager, etc. | AWS account (Terraform) |

---

# ════════════════════════════════════════
# BACKEND
# ════════════════════════════════════════

## CHAT 0 — Bootstrap & verify the scaffold

**Model:** `composer-2.5-fast` (Fast)

```
Get the monorepo running for the first time. Steps:
1. Run `pnpm install` at the root and report any errors.
2. Run `pnpm db:up` to start Postgres + Redis + Mailpit; confirm containers are healthy.
3. Generate a real RS256 keypair with openssl, plus a random TOTP key and refresh HMAC secret. Show me the exact commands and the values to paste into .env.local (copy .env.example first). Do NOT invent placeholder secrets; do NOT commit .env.local.
4. Start @apps/api with `pnpm --filter @loomis/api dev` and confirm GET /health returns ok.
Report what worked and what is blocked. Do not change the declared stack to work around any failure.
```

---

## PHASE 1 — FOUNDATION

### CHAT 1A — Identity: data layer

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Build the Identity module data layer. Follow @loomis-module-patterns, @loomis-database, @loomis-security.
Reference: System Design §5 (auth/session) and §6 (DB); SRS §9 SEC-AUTH-001..015.

Create:
- drizzle/schema/identity.ts with 7 tables: users, user_sessions, refresh_tokens, registered_devices, mfa_configs, login_attempts, password_reset_otps.
- modules/identity/types.ts
- modules/identity/repository/ (user, session, device, mfa, token repos)
- services: password.service.ts (Argon2id), token.service.ts (JWT RS256 sign/verify + user_ver check + jti blacklist in Redis), mfa.service.ts (TOTP gen/verify + Argon2-hashed backup codes)
- contracts under packages/contracts/src/identity (session, mfa, password schemas)

If any secret/credential is missing, STOP and name the exact env var — no mocks, no substitutes. Generate the Drizzle migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 1B — Identity: auth flows

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Build the Identity auth flows on the existing data layer. Follow @loomis-module-patterns, @loomis-security, @loomis-api.
Reference: System Design §5.1–5.5; SRS SEC-AUTH-001..015; user stories US-XC-001..005.

Create:
- services: auth.service.ts (login → authenticated | mfa_required | mfa_enrollment_required; refresh with single-use rotation + family binding; logout; step-up), session.service.ts (create/revoke, 5-session concurrent limit, idle vs absolute timeout), device.service.ts (register/deregister, persistent token)
- handlers + routes under /api/v1/auth: login, mfa/verify, mfa/enroll, refresh, logout, stepup

Enforce account lockout (5 fails/10min) and MFA-mandatory-roles-locked-until-enrolled.
SES/Termii delivery is not configured — mark those paths // BLOCKED and tell me; do not mock. Commit when done.
@apps/api/src/modules/identity @packages/contracts/src/identity
```

### CHAT 1C — Identity: middleware, session endpoints, tests

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Finish the Identity module. Follow @loomis-module-patterns, @loomis-security, @loomis-roles.

Create:
- src/middleware: authenticate (JWT + user_ver + blacklist), require-role, require-tenant-match, require-stepup, login-rate-limiter
- session/device endpoints: list active sessions, revoke session, list/deregister devices (US-HRM-008)
- event consumers for staff.deactivated and staff.role.changed → bump user_ver + revoke sessions; HRM doesn't exist yet so wire the consumer with a labelled note, do not fake the source
- tests: refresh rotation/replay, concurrent-session displacement, lockout, user_ver invalidation

Commit when done. This completes Phase 1 Step 1.
@apps/api/src
```

### CHAT 2 — Tenant module

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Tenant module. Follow @loomis-module-patterns, @loomis-database, @loomis-security, @loomis-financial-integrity.
Reference: System Design §3.2 (tenant schema/events); SRS §2.6 CON-001/006/011; user stories US-PLT-001..003.

Create schema (tenants, tiers, configurations, psf_rate_snapshots) + repository + services + routes under /api/v1.
Rules: provisioning + suspend/reinstate; PSF rate snapshots immutable; PSF rate of zero permanently blocked (DB check + Zod); rate-override requires dual approval (wire workflow hook, stub with labelled note if workflow module absent).
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 3 — HRM module

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the HRM module. Follow @loomis-module-patterns, @loomis-database, @loomis-security, @loomis-roles.
Reference: SRS §4.14 FR-HRM-001..008; user stories US-HRM-001..009.

Create schema (staff_profiles, role_assignments, subject_assignments, classteacher_assignments, staff_invitations) + repository + services + routes.
Rules: invitation onboarding (48h expiry); role change → publish staff.role.changed; deactivation → publish staff.deactivated + singleton-role guard; one Class Teacher per arm per term; SoD respected.
Invitation emails need SES (not configured) — mark // BLOCKED, don't mock. Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 4 — Academic Session module

**Model:** `claude-opus-4-8-thinking-high` (Heavy — census lock creates PSF liability)

```
Build the Academic Session module. Follow @loomis-module-patterns, @loomis-database, @loomis-financial-integrity.
Reference: SRS §4.3 FR-ASM-001..010, §2.6 CON-017..022; System Design §8.1 (census lock transaction); user stories US-ASM-001..007.

Create schema (academic_years, academic_terms, class_levels, class_arms, class_progression_map, student_promotion_records) + repository + services + routes.
Rules: one active year + one open term at a time; census lock = single SERIALIZABLE transaction with step-up MFA that creates PSF obligations via the outbox (Ledger consumes later); term/year closure gate checks.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 5 — Student module (completes Phase 1)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Student module. Follow @loomis-module-patterns, @loomis-database, @loomis-security.
Reference: SRS §4.4 (student info system), CON-002 (no cross-tenant joins); user stories US-SIS-001..007.

Create schema (students, admissions, enrollments, parent_links, parent_identities) + repository + services + routes.
Rules: admissions → approval → enrollment; enrollment feeds billable census; parent-student link requires parent OTP (Admin Officer cannot self-complete); parent identity global, links per-tenant, NO cross-tenant joins.
Parent OTP needs SES/Termii (not configured) — mark // BLOCKED, don't mock. Add contracts, migration. Commit. Phase 1 complete.
@apps/api/src @packages/contracts/src
```

---

## PHASE 2 — OPERATIONS

### CHAT 6 — Workflow & Approval Engine (build early; many flows depend on it)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Workflow module. Follow @loomis-module-patterns, @loomis-database, @loomis-security.
Reference: SRS §4.10 + Appendix D (workflow types); System Design (workflow module); user stories US-WRK-001..003.

Create schema (workflow_instances, workflow_steps, workflow_decisions) + repository + services + routes.
Rules: configurable approver chains by role; requester cannot approve own request (enforce in service); escalation/timeout; emit workflow.completed / workflow.escalated.
Provide a clean WorkflowService API other modules call to start/advance workflows. Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 7 — Storage module

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Storage module. Follow @loomis-module-patterns, @loomis-security.
Reference: SRS §10.5; System Design §10 (storage architecture).

Create schema (storage_objects) + service + routes: POST /storage/upload-url (pre-signed PUT), GET /storage/objects/:id/url (pre-signed GET), with tenant+role checks and storage.object.accessed audit events.
Rules: private buckets, opaque keys, 5-min URL expiry, malware-scan hook on upload.
AWS S3 creds/bucket are required — if missing, STOP and ask me for S3_BUCKET/S3_REGION/AWS keys; do not switch to local disk or mock S3 without my explicit approval. Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 8 — Academic Operations: grading schemes + gradebook

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build grading schemes and gradebook in the Academic module. Follow @loomis-module-patterns, @loomis-database, @loomis-roles.
Reference: SRS §4.5 (academic mgmt), CON-004/005; user stories US-ACA-001..004.

Add schema (grading_schemes, gradebook_entries, grade_correction_logs, exam_configs, results) + repository + services + routes.
Rules: scheme weights must sum to 100 (DB + Zod); Teacher writes only own assigned subjects; Class Teacher read-only gradebook; grade correction via Workflow (Exam Officer → Principal); result publish requires step-up MFA.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 9 — Academic Operations: attendance + timetable

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build attendance and timetable in the Academic module. Follow @loomis-module-patterns, @loomis-database, @loomis-roles.
Reference: SRS §4.5 CON-003; user stories US-ACA-005..007.

Add schema (attendance_records, timetables, assignments, submissions) + repository + services + routes.
Rules: ONLY Class Teacher marks attendance (Teachers blocked at middleware + service); offline sync entries are signed per-tenant device key and verified server-side; same-day amendment only, logged; timetable conflict detection.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 10 — Finance: fee structures + invoices

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build fee configuration and invoicing in the Finance module. Follow @loomis-module-patterns, @loomis-database, @loomis-financial-integrity.
Reference: SRS §4.6; user stories US-FIN-001, US-FIN-005.

Add schema (fee_structures, invoices) + repository + services + routes.
Rules: per-class-level fee items; amounts in kobo (bigint); fee changes after term open require Principal approval (Workflow) + audit; outstanding-balance query is tenant-scoped and indexed.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 11 — Finance: payments (offline + online + webhooks)

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Build payments in the Finance module. Follow @loomis-module-patterns, @loomis-financial-integrity, @loomis-security.
Reference: SRS §4.6, §10.1; System Design §9 (payment architecture); user stories US-FIN-002..004.

Add schema (payments, receipts, webhook_events) + Gateway Abstraction Layer + repository + services + routes.
Rules: offline log (Cashier) vs verify (Accountant) — cashier CANNOT verify own payment; idempotency keys on all writes; webhook pipeline = verify HMAC FIRST, idempotent upsert on (provider,event_id), then process via outbox; payment.verified settles PSF obligations (Ledger consumes).
Gateway keys/webhook secrets are required — if missing, STOP and ask me (Paystack/Flutterwave sandbox); do not mock the gateway. Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 12 — Finance: refunds + reconciliation

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Build refunds and reconciliation in the Finance module. Follow @loomis-module-patterns, @loomis-financial-integrity.
Reference: SRS §4.6, §10.2; user stories US-FIN-006, US-FIN-007.

Add schema (refund_requests, reconciliation_exceptions) + services + routes.
Rules: refund via Workflow (Cashier → Accountant → Principal → Owner) with step-up at approval; refund posts negative ledger transaction; PSF NOT reversed except duplicate/error/chargeback/legal (dual approval); nightly gateway reconciliation job (BullMQ) flags exceptions.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

---

## PHASE 3 — REVENUE INTEGRITY

### CHAT 13 — Ledger module

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Build the Ledger module. Follow @loomis-module-patterns, @loomis-financial-integrity, @loomis-database.
Reference: Revenue Integrity Architecture FINAL §A/§B; System Design §8.1/§8.3.

Create schema (psf_obligations, psf_settlements, ledger_entries [INSERT-only], outbox_events) + repository + LedgerService + consumers.
Rules: double-entry, every transaction nets to zero; immutable INSERT-only entries; consume academic.term.census_locked → create PSF obligations; consume payment.verified → settle; nightly balance-check job (P1 alert on failure). Use INSERT-only DB role pattern.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 14 — Billing entitlement + census-lock integration

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Wire the PSF billing entitlement pipeline end to end. Follow @loomis-financial-integrity, @loomis-module-patterns.
Reference: Revenue Integrity Architecture FINAL §A (PSF lifecycle); System Design §8.1.

Connect Academic Session census lock → Ledger PSF obligation creation in one SERIALIZABLE transaction via outbox; handle post-census late enrollment → immediate obligation at the term's rate snapshot; create enrollment_attestation records (signed, immutable) with student-list hash.
Add tests proving: no PSF without census; payment settles not creates; late enrollment billed. Commit when done.
@apps/api/src
```

### CHAT 15 — Risk / IVP module

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Build the Risk/IVP module. Follow @loomis-module-patterns, @loomis-database, @loomis-security.
Reference: Revenue Integrity Architecture FINAL (IVP); System Design §8.2; user stories US-REV-003..006.

Create schema (ivp_signal_snapshots, ivp_anomaly_cases, privileged_change_requests, break_glass_sessions) + services + routes.
Rules: nightly IVP batch (BullMQ) computes weighted anomaly score from attendance/payment/gradebook/device/parent-link signals; score thresholds open cases; active case holds referral earnings; privileged changes need dual approval; break-glass needs ticket id, 30-min expiry, owner notified.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

---

## PHASE 4 — ECOSYSTEM

### CHAT 16 — Referral module

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced — bump to Heavy if cap/accrual logic gets hairy)

```
Build the Referral module. Follow @loomis-module-patterns, @loomis-financial-integrity, @loomis-security.
Reference: SRS §4.13 FR-REF-001..007, Appendix C; user stories US-REF-001..004.

Create schema (participants, kyc_records, referral_codes, attributions, earning_entries, payout_cycles) + services + routes.
Rules: KYC + conflict-of-interest gate before earning; codes stored as HMAC hash, shown once; earnings only from settled non-disputed PSF; 40% per-tenant payout cap; manager cannot approve own subordinate KYC; earnings held during IVP cases.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 17 — Comms module

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Comms module. Follow @loomis-module-patterns, @loomis-security.
Reference: SRS §4.7, §10.3/§10.4; user stories US-COM-001..004.

Create schema (messages, notifications, push_subscriptions, notification_templates) + services + routes + event consumers (subscribe to domain events to generate notifications).
Rules: parents reply-only to received messages; class-teacher → class parents; notification bodies never contain PII/grades/amounts.
SES/Termii/FCM/APNs are required for delivery — if missing, STOP and ask; do not mock delivery. Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

---

## PHASE 5 — COMPLIANCE

### CHAT 18 — Compliance module (NDPA)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Compliance module. Follow @loomis-module-patterns, @loomis-security.
Reference: SRS §6.6; System Design §19; user stories US-AUD-002..005.

Create schema (dsars, breach_records, consent_versions, retention_schedules, retention_events) + services + routes.
Rules: DSAR pipeline (30-day deadline, escalation alerts); breach record + 72h NDPC clock + pre-filled draft; retention engine (nightly) anonymises expired PII then hard-deletes after 90 days; DPO-only access.
Add contracts, migration. Commit when done.
@apps/api/src @packages/contracts/src
```

### CHAT 19 — Audit hardening + read models

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Harden audit and build cross-module read models. Follow @loomis-module-patterns, @loomis-security, @loomis-database.
Reference: SRS CON-007/008; System Design §3.3 (audit), §6.2 (read_models).

Verify the shared writeAudit helper runs inside every write transaction; confirm audit tables are INSERT-only at the DB role level; add fail-closed middleware (requireAuditAvailable) on financial writes; build read_models projections (e.g. parent multi-child dashboard, regional analytics) maintained by event consumers.
Add tests. Commit when done.
@apps/api/src
```

---

# ════════════════════════════════════════
# SHARED FRONTEND LAYER
# ════════════════════════════════════════

### CHAT 20 — api-client: http core + refresh

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Build the api-client HTTP core. Follow @loomis-frontend.
Reference: Frontend Architecture §3 (shared API client).

In packages/api-client/src: implement http/client.ts (fetch wrapper using injected adapters), http/interceptors.ts (auth, X-Tenant-Id, X-Request-Id, Idempotency-Key), http/refresh.ts (single-flight refresh + token family rotation). Use the existing types.ts and errors.ts.
Distinguish IDENTITY_TOKEN_EXPIRED (refresh+retry) vs IDENTITY_SESSION_INVALIDATED (hard logout). Add tests for single-flight refresh and the two-401 split. Commit when done.
@packages/api-client/src
```

### CHAT 21 — api-client: query keys + hooks + financial mutation

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the api-client query layer. Follow @loomis-frontend.
Reference: Frontend Architecture §5, §6.

In packages/api-client/src: query/keys.ts (tenant-partitioned key factory), query/hooks/* (TanStack Query hooks per module, starting with identity + student), mutations/useFinancialMutation.ts (idempotency key on mount + inline step-up MFA + 409-replay-as-success).
Every tenant-scoped key includes tenantId as element 2. Add tests. Commit when done.
@packages/api-client/src
```

---

# ════════════════════════════════════════
# WEB APP (Next.js 15)
# ════════════════════════════════════════

### CHAT 22 — Web: initialise + providers + design system

**Model:** `composer-2.5-fast` (Fast)

```
Initialise the Next.js 15 web app. Follow @loomis-frontend.
Reference: Frontend Architecture §7, §7.5.

Scaffold create-next-app in apps/web (TypeScript, Tailwind, App Router, src dir). Set up: root layout with TanStack Query provider + error boundaries; Tailwind preset consuming @loomis/design-tokens; Shadcn/UI init in packages/ui-web; the @loomis/api-client wired with the web token-store adapter (memory access token).
Confirm it builds and renders a placeholder home. Commit when done.
@apps/web @packages/ui-web @packages/api-client
```

### CHAT 23 — Web: BFF auth + login/MFA screens

**Model:** `claude-opus-4-8-thinking-high` (Heavy — token storage security)

```
Build web authentication. Follow @loomis-frontend, @loomis-security.
Reference: Frontend Architecture §7.2, §7.3; user stories US-XC-001..003.

Create: app/api/auth/* route handlers (BFF) that store the refresh token in an httpOnly Secure SameSite=Strict cookie and keep the access token in memory; (auth) route group with login, MFA verify, MFA enrollment, password reset; middleware.ts edge auth gate + role-based route-group protection.
Never put JWTs in localStorage. Add tests. Commit when done.
@apps/web
```

### CHAT 24 — Web: school console shell + dashboard + session/staff screens

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the school console shell. Follow @loomis-frontend, @loomis-roles.
Reference: Frontend Architecture §7.1, §9; user stories US-HRM-001..009.

Create the (school) route group: layout with role-adaptive sidebar (use can(role, capability) from @loomis/core), dashboard, staff directory + invite + assignments (HRM), and settings/security (active sessions + device registry).
Gate every action with the capability map. Use TanStack Query hooks + RHF forms with shared contract schemas. Commit when done.
@apps/web
```

### CHAT 25 — Web: academic session + census lock

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build academic session screens. Follow @loomis-frontend, @loomis-financial-integrity.
Reference: user stories US-ASM-001..007.

In (school): academic year create/activate, term configure/open/close, and the census-lock flow (auto-populated count, MTC comparison, variance reason, step-up MFA via useFinancialMutation). Show clear immutable-action warnings. Commit when done.
@apps/web
```

### CHAT 26 — Web: students + admissions

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build student screens. Follow @loomis-frontend.
Reference: user stories US-SIS-001..007.

In (school): admissions pipeline, admission decision, enrollment, student profile, parent-link initiation. Tenant-partitioned queries only. Commit when done.
@apps/web
```

### CHAT 27 — Web: academic operations (gradebook, attendance view, results)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build academic operations screens. Follow @loomis-frontend, @loomis-roles.
Reference: user stories US-ACA-001..007.

In (school): grading scheme builder (live 100% weight validation), gradebook entry (teacher, own subjects), read-only consolidated gradebook (class teacher), attendance view, result publish (step-up MFA), grade-correction workflow UI. Commit when done.
@apps/web
```

### CHAT 28 — Web: finance (fees, payments, refunds)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build finance screens. Follow @loomis-frontend, @loomis-financial-integrity.
Reference: user stories US-FIN-001..007.

In (school): fee structure config, offline payment log (cashier), payment verification (accountant — hide verify on own-logged payments), outstanding balances, refund request/approval workflow. Money entered in Naira, sent as kobo. Use useFinancialMutation. Commit when done.
@apps/web
```

### CHAT 29 — Web: platform console

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the platform console. Follow @loomis-frontend, @loomis-roles.
Reference: user stories US-PLT-001..007, US-REV-001..006.

Create (platform) route group: tenant provisioning/suspend, PSF rate config (dual-approval + step-up), revenue dashboard (from ledger), IVP anomaly case management, referral attribution/oversight, break-glass activation. Platform actors have null tenant context. Commit when done.
@apps/web
```

### CHAT 30 — Web: regional + compliance consoles

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build regional and compliance consoles. Follow @loomis-frontend, @loomis-roles.
Reference: user stories US-REG-001..005, US-AUD-001..005.

Create (regional) group: aggregated regional dashboard, school onboarding, subordinate mgmt, referral earnings. Create (platform) compliance area for DPO: DSAR queue, breach workflow, retention/consent config, audit log search/export (step-up). Commit when done.
@apps/web
```

---

# ════════════════════════════════════════
# MOBILE APP (Expo React Native)
# ════════════════════════════════════════

### CHAT 31 — Mobile: initialise + providers + secure store + design system

**Model:** `composer-2.5-fast` (Fast)

```
Initialise the Expo app. Follow @loomis-frontend.
Reference: Frontend Architecture §8, §8.7.

Scaffold create-expo-app in apps/mobile (Expo Router). Set up: root layout with TanStack Query provider + auth gate + offline banner; NativeWind preset from @loomis/design-tokens; @loomis/api-client wired with the mobile token-store adapter (Expo SecureStore); lib/secure-store.ts and lib/biometrics.ts.
Confirm it runs in Expo. Commit when done.
@apps/mobile @packages/ui-mobile @packages/api-client
```

### CHAT 32 — Mobile: offline engine (the critical one)

**Model:** `claude-opus-4-8-thinking-high` (Heavy — trickiest piece in the build)

```
Build the mobile offline engine. Follow @loomis-frontend.
Reference: Frontend Architecture §8.2–8.6; System Design §11.1.

In apps/mobile/src/offline: db.ts (encrypted expo-sqlite schema + migrations), queue.ts (enqueue/dequeue pending mutations), crypto.ts (per-tenant ECDSA P-256 device key in SecureStore, sign payload+tenant+device+timestamp), sync-engine.ts (sync on connectivity/foreground, server verifies signature, conflict resolution per the protocol, quarantine on tenant mismatch, 7-day stale prompt).
Write thorough tests for every conflict branch and the signature/tenant-mismatch rejection. Commit when done.
@apps/mobile/src/offline
```

### CHAT 33 — Mobile: auth + biometrics

**Model:** `claude-opus-4-8-thinking-high` (Heavy — security)

```
Build mobile authentication. Follow @loomis-frontend, @loomis-security.
Reference: Frontend Architecture §8.1; SRS SEC-AUTH-004; user stories US-XC-001..002.

Create (auth) stack: login, MFA verify/enroll. Tokens in SecureStore. Biometric (Face ID/fingerprint) as secondary login after initial password+MFA; biometrics never bypass step-up MFA. On IDENTITY_SESSION_INVALIDATED → hard logout but PRESERVE the offline queue. Commit when done.
@apps/mobile/src
```

### CHAT 34 — Mobile: Class Teacher app (offline attendance)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Class Teacher mobile app. Follow @loomis-frontend, @loomis-roles.
Reference: user stories US-ACA-005; SRS CON-003.

Create (class-teacher) stack: class overview, offline attendance marking (writes to local SQLite first, syncs via the offline engine), class read-only gradebook, parent messaging. Attendance reachable in ≤3 taps. Commit when done.
@apps/mobile/src
```

### CHAT 35 — Mobile: Teacher app (offline gradebook)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Teacher mobile app. Follow @loomis-frontend, @loomis-roles.
Reference: user stories US-ACA-002, US-ACA-007.

Create (teacher) stack: assigned-subjects dashboard, offline gradebook entry (own subjects only, local-first sync), assignments, materials. Commit when done.
@apps/mobile/src
```

### CHAT 36 — Mobile: Parent app

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Parent mobile app. Follow @loomis-frontend.
Reference: user stories US-PAR-001..005.

Create (parent) stack: multi-child dashboard (separate tenant-scoped query per child — no cross-tenant joins), per-child attendance/results/fees, online fee payment (useFinancialMutation), communication hub (reply-only), contact-detail update (MFA + cooling-off). Active-child switch updates tenant context. Commit when done.
@apps/mobile/src
```

### CHAT 37 — Mobile: Student app + push notifications

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Build the Student app and push notifications. Follow @loomis-frontend.
Reference: user stories US-STU-001..004, US-COM-004.

Create (student) stack: results, timetable, assignment submission, own attendance. Then wire expo-notifications (FCM/APNs): register device token via PATCH /devices/:id/push-token; notification bodies carry only opaque deep-link IDs (no PII/grades).
FCM/APNs credentials are required — if missing, STOP and ask me; do not mock push. Commit when done.
@apps/mobile/src
```

---

# ════════════════════════════════════════
# HARDENING & RELEASE
# ════════════════════════════════════════

### CHAT 38 — E2E tests (web)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Add Playwright E2E tests for web critical journeys. Follow @loomis-frontend.
Cover: login+MFA, census lock (step-up), log+verify offline payment, refund approval chain, staff onboarding. Run against a seeded local stack. Commit when done.
@apps/web
```

### CHAT 39 — E2E tests (mobile)

**Model:** `claude-4.6-sonnet-medium-thinking` (Balanced)

```
Add Maestro E2E flows for mobile. Follow @loomis-frontend.
Cover: login, mark attendance offline → reconnect → sync, view results, parent fee payment. Commit when done.
@apps/mobile
```

### CHAT 40 — Pre-launch security + infra review

**Model:** `claude-opus-4-8-thinking-high` (Heavy)

```
Run a pre-launch hardening pass. Follow @loomis-security, @loomis-financial-integrity.
Reference: System Design §13 (security), §15 (DR), SRS §9.6.

Checklist (report findings, fix what's code-level, flag what needs me): RLS RESTRICTIVE on all tenant tables; INSERT-only roles on audit+ledger; secrets only from env/Secrets Manager; security headers; rate limits; fail-closed financial writes; webhook signature verification; idempotency coverage. List everything requiring my credentials or AWS/Terraform action — do not provision or fake them.
@apps/api @apps/web @apps/mobile
```

---

## Reusable Templates

**Generic new-module (Phase 2+ or future):**

```
Build the <NAME> module. Follow @loomis-module-patterns, @loomis-database, @loomis-security + any domain rule that applies.
Reference: SRS §<X> FR-<PREFIX>-*, System Design §<Y>, user stories US-<PREFIX>-*.
Create schema + repository + services + handlers + routes + contracts + migration in the standard structure.
If anything needs a credential/external service I haven't provided, STOP and name it — never mock or substitute. Commit when done.
@apps/api/src @packages/contracts/src
```

**Bug fix (scoped/cheap):**

```
Bug: <what happens> in <area>. Expected: <what should happen>.
Read only the relevant file(s), find the cause, fix minimally, explain in 2 lines. No unrelated refactors.
@<exact file path>
```

**End-of-chat close (paste when done):**

```
Summarise what you built in 5 bullets, list any // BLOCKED items and the env vars I still owe you, then commit with a clear message. I'm closing this chat after.
```

---

*Loomis Build Prompts Playbook — aligned to SRS v3, System Design v1, Frontend Architecture v1, and the .cursor/rules. Adjust section numbers if the source docs are revised.*
