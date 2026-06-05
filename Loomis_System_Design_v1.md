# Loomis Platform — System Design Document v1

**Classification:** Production-Grade Engineering Specification
**Date:** 05 June 2026
**Authored by:** Principal Software Architect / Distributed Systems Engineer / Cloud Infrastructure Architect / Security Architect / Database Engineer
**Basis:** Loomis SRS v3 · Loomis Revenue Integrity Architecture FINAL · Loomis User Stories v1

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 05/06/2026 | Architecture Team | Initial system design covering all 18 domains: architecture decision, service decomposition, API design, auth and session architecture, database architecture, event-driven pipeline, revenue integrity, payments, mobile, infrastructure (AWS), security, observability, DR/HA, scalability, CI/CD, integrations, and NDPA compliance architecture |

---

## Document Conventions

Monetary amounts are stored in minor currency units (kobo for NGN) as `BIGINT`. All identifiers are UUIDv7 unless stated otherwise — UUIDv7 carries a millisecond-precision timestamp in the high bits, making them naturally time-sortable without a separate `created_at` index for pagination. All times are stored and transmitted as UTC ISO-8601 with timezone offset. Currency is ISO 4217. Diagram blocks are ASCII text. Decisions are annotated with their rationale so future engineers understand the trade-offs made.

---

## 1. Architecture Decision — Modular Monolith

### 1.1 Decision

Loomis v1 is built as a **Modular Monolith with an asynchronous event spine**. All domain modules are deployed as a single application process. Domain boundaries are enforced at the code level via strict module ownership of database schemas and prohibition of cross-module direct database access. The event spine (async message bus) handles all cross-domain side effects.

### 1.2 Rationale

A full microservices architecture from day one would give Loomis distributed systems complexity — network partitions, distributed transactions, service discovery, multi-service deployment coordination, polyglot debugging — before the team has established stable domain boundaries or reached the scale that justifies it. The Modular Monolith delivers the same logical separation with a fraction of the operational burden.

The following signals trigger extraction of a module to a standalone service in the future: the module needs an independent release cycle due to different change velocity; the module needs independent scaling due to its CPU or memory profile being materially different from the rest of the application; the module team reaches a size that causes merge conflicts; or the module's latency requirements conflict with co-location.

Revenue Integrity (PSF Billing, Platform Ledger, Risk/IVP) and the Identity module are the most likely candidates for early extraction given their compliance and isolation requirements.

### 1.3 Architecture Principles

Every principle here directly addresses a failure mode identified in the Adversarial Analysis or SRS constraints.

**Principle 1 — Fail Closed on Financial Writes.** If the audit store, the ledger, or the outbox relay are unavailable, financial and privileged write operations return 503. They do not proceed without a complete audit trail. A write without a record never happened and cannot be reconciled.

**Principle 2 — Immutability of Financial Records.** PSF obligations, ledger entries, audit events, and attestation records are never updated or deleted. Corrections are new records. This is enforced at the database constraint layer, not only the application layer.

**Principle 3 — Defense in Depth.** No security control stands alone. Tenant isolation is enforced at the application layer AND the database RLS layer. Role access is enforced at the API gateway AND the application controller AND the query builder. A bug in any single layer does not expose data.

**Principle 4 — Idempotency by Default.** Every financial API endpoint and every event consumer is idempotent. Duplicate payment webhooks, retry storms, and replayed queue messages produce no side effects beyond the first successful processing.

**Principle 5 — Deterministic Revenue.** PSF liability is determined by enrollment state, not payment state. Payment events settle liability; they do not create it. This severs the chain by which a dishonest school could underreport by keeping students off the payment system.

**Principle 6 — Least Privilege at Every Layer.** Database roles have the minimum permissions needed. Application service accounts have no DDL access. API keys are scoped to a single purpose. No service has credentials that would allow it to do more than its single domain responsibility.

**Principle 7 — Observable by Default.** Every request carries a correlation ID from the moment it enters the API gateway to the moment it exits. Every domain event carries the same correlation ID and a causation ID tracing which upstream event triggered it. Debugging a financial discrepancy must be possible by querying a single structured log store.

---

## 2. System Topology

The system is layered as follows. Each layer is a separate network zone with controlled ingress from the layer above.

```
 ┌──────────────────────────────────────────────────────────────────┐
 │  CLIENTS                                                         │
 │  Web Browser  │  iOS App  │  Android App  │  Admin Console       │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │ HTTPS / WSS
 ┌────────────────────────────────▼─────────────────────────────────┐
 │  EDGE LAYER                                                      │
 │  CloudFront CDN  ──  AWS WAF (OWASP rules + rate limiting)       │
 │  TLS termination at ALB                                          │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
 ┌────────────────────────────────▼─────────────────────────────────┐
 │  API GATEWAY LAYER  (Application Load Balancer + Kong Gateway)   │
 │  JWT validation · Tenant header injection · Request-ID stamping  │
 │  Per-tenant rate limiting · Per-role rate limiting               │
 └───────────┬────────────────────────────────────────┬────────────┘
             │ REST / HTTP                             │ WebSocket
 ┌───────────▼────────────────────────────────────────▼────────────┐
 │  APPLICATION LAYER  (ECS Fargate — Private Subnet)               │
 │                                                                  │
 │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
 │  │ Identity │  │  Tenant  │  │   HRM    │  │ Academic │        │
 │  │  Module  │  │  Module  │  │  Module  │  │  Module  │        │
 │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
 │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
 │  │ Student  │  │ Finance  │  │  Ledger  │  │  Risk /  │        │
 │  │  Module  │  │  Module  │  │  Module  │  │  IVP     │        │
 │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
 │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
 │  │ Referral │  │  Comms   │  │ Workflow │  │Compliance│        │
 │  │  Module  │  │  Module  │  │  Module  │  │  Module  │        │
 │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
 │  ┌──────────┐                                                   │
 │  │ Storage  │                                                   │
 │  │  Module  │                                                   │
 │  └──────────┘                                                   │
 └──────┬────────────────────────────────────────────┬────────────┘
        │ SQL                                         │ Publish/Subscribe
 ┌──────▼──────────────────────────┐        ┌────────▼────────────┐
 │  DATA LAYER                     │        │  EVENT BUS          │
 │  Aurora PostgreSQL (Primary)    │        │  AWS SQS + SNS      │
 │  Aurora PostgreSQL (Read Replica│        │  EventBridge        │
 │  ElastiCache Redis (Session +   │        │  (Outbox Relay)     │
 │    Token Blacklist + Rate Limit)│        └─────────────────────┘
 │  Audit DB (Append-only,         │
 │    Time-partitioned)            │
 └─────────────────────────────────┘
        │
 ┌──────▼────────────────────────────────────────────────────────┐
 │  EXTERNAL INTEGRATIONS                                        │
 │  Paystack · Flutterwave · Monnify/Remita                      │
 │  AWS SES  · Termii / Africa's Talking SMS                     │
 │  FCM (Android Push) · APNs (iOS Push)                        │
 │  S3 (Object Storage)  · CloudFront (Asset CDN)               │
 └───────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Module Decomposition

### 3.1 Module Ownership Rules

Each module is a cohesive unit of code with the following invariants:

- A module owns exactly one PostgreSQL schema. No other module writes to that schema directly.
- A module's public interface to other modules is either an in-process domain event (for notifications) or a published async event on the event bus (for cross-domain side effects).
- Modules never share a transaction boundary. If two modules must stay consistent, the outbox pattern coordinates them via eventual consistency.
- Read-side queries that need data from multiple modules use a dedicated read model schema maintained by an event consumer, not a cross-schema join.

### 3.2 Module Summary

| Module | Schema | Owns | Publishes | Consumes |
|--------|--------|------|-----------|----------|
| Identity | `identity` | Users, sessions, devices, MFA config, token blacklist | `user.session.created`, `user.session.revoked`, `user.mfa.changed`, `user.password.changed` | `staff.deactivated`, `staff.role.changed` |
| Tenant | `tenant` | Tenants, tiers, configurations, PSF rate snapshots | `tenant.provisioned`, `tenant.suspended`, `tenant.psf_rate.changed` | — |
| HRM | `hrm` | Staff profiles, invitations, role assignments, subject assignments, class-teacher assignments | `staff.onboarded`, `staff.role.changed`, `staff.deactivated`, `subject.assignment.changed` | `academic.term.opened` |
| Academic | `academic` | Academic years, terms, class levels, class arms, timetables, attendance, gradebook, exams, results, grading schemes, assignments | `term.opened`, `term.census_opened`, `term.closed`, `attendance.marked`, `gradebook.locked`, `result.published` | `student.enrolled`, `hrm.subject.assignment.changed` |
| Student | `student` | Students, admissions, enrollments, promotions, graduation, parent-student links | `student.enrolled`, `student.graduated`, `student.transferred_out`, `parent.link.verified` | `academic.term.opened`, `academic.term.closed` |
| Finance | `finance` | Fee structures, invoices, payments (online + offline), receipts, refund requests | `payment.verified`, `payment.webhook.received`, `refund.approved` | `student.enrolled`, `billing.psf_obligation.created` |
| Ledger | `ledger` | Platform ledger entries (double-entry, immutable), PSF obligations, PSF settlements | `ledger.transaction.posted`, `billing.psf_obligation.created`, `billing.psf_obligation.settled` | `payment.verified`, `refund.approved`, `academic.term.census_locked` |
| Risk/IVP | `risk` | IVP signal snapshots, anomaly cases, privileged change requests, break-glass sessions | `risk.signal.detected`, `risk.ivp_case.opened`, `risk.ivp_case.closed` | `payment.verified`, `attendance.marked`, `student.enrolled`, `ledger.transaction.posted` |
| Referral | `referral` | Participants, KYC records, referral codes, attributions, earning entries, payout cycles | `referral.earning.accrued`, `referral.payout_cycle.closed` | `billing.psf_obligation.settled`, `tenant.provisioned`, `risk.ivp_case.opened` |
| Comms | `comms` | Messages, notifications, notification templates, push subscriptions | `notification.sent` | All modules (consumes events to generate notifications) |
| Workflow | `workflow` | Workflow instances, steps, decisions, escalations | `workflow.completed`, `workflow.escalated` | Multiple — workflow triggers come from Finance, HRM, Academic, Student |
| Compliance | `compliance` | DSARs, breach records, consent versions, retention schedules, NDPA records | `dsar.fulfilled`, `breach.notified` | `audit.event.recorded` |
| Storage | `storage` | Storage objects metadata, access logs | `storage.object.accessed` | — |

### 3.3 Audit Module (Special Case)

The audit module is not a first-class application module. It is a cross-cutting concern implemented as a middleware interceptor in every module. Every write operation automatically records an `audit_event` in the same database transaction using a shared audit writer library. This library cannot be bypassed by individual modules because the write happens inside the shared transaction wrapper, not as a separate call the module makes.

The audit events table is in a dedicated `audit` schema. It is append-only: the application database role for the audit schema has `INSERT` only — no `UPDATE` or `DELETE`. Partition rotation is a DBA-level operation requiring MFA and is permanently recorded in a separate operations log.

---

## 4. API Architecture

### 4.1 Conventions

All APIs are versioned under `/api/v1/`. The version is in the URL, not the Accept header, to make proxy caching and gateway routing straightforward. Breaking changes produce a new version prefix. Non-breaking additions (new optional fields, new endpoints) are made in the same version.

**Standard Request Headers**

| Header | Required On | Purpose |
|--------|------------|---------|
| `Authorization: Bearer <token>` | All authenticated requests | JWT access token |
| `X-Tenant-Id: <uuid>` | All tenant-scoped requests | Tenant context; validated against JWT claims |
| `Idempotency-Key: <uuid>` | All financial and workflow writes | Prevents duplicate processing |
| `X-Request-Id: <uuid>` | All requests | Distributed tracing correlation; generated by client; if absent, generated by gateway |
| `X-MFA-Token: <otp_token>` | Step-up MFA required actions | Short-lived MFA step-up proof token |

**Standard Response Shape**

All responses use a consistent envelope:

```
{
  "status": "success" | "error",
  "data": { ... },          // present on success
  "error": {                // present on error
    "code": "PAYMENT_DUPLICATE",
    "message": "Human-readable description",
    "request_id": "uuid"
  },
  "meta": {
    "request_id": "uuid",
    "api_version": "v1",
    "timestamp": "ISO-8601"
  }
}
```

**Error Codes** are namespaced by domain: `IDENTITY_`, `TENANT_`, `FINANCE_`, `BILLING_`, `LEDGER_`, `RISK_`, `REFERRAL_`, `ACADEMIC_`, `STUDENT_`, `WORKFLOW_`, `STORAGE_`, `COMMS_`, `HRM_`, `COMPLIANCE_`. This allows clients to handle errors programmatically without parsing message strings.

### 4.2 Rate Limiting

Rate limiting is enforced at the Kong API Gateway layer and is tenant-aware.

| Limit Type | Threshold | Action on Breach |
|-----------|-----------|-----------------|
| Unauthenticated requests (login, OTP) | 20 requests per minute per IP | 429 Too Many Requests |
| Authenticated requests per tenant | 1,000 requests per minute per tenant | 429 with Retry-After header |
| File upload per tenant | 50 uploads per minute | 429 |
| Webhook inbound (payment gateways) | 500 per minute per provider IP | 429 (provider is expected to retry) |
| Export endpoints | 5 per hour per user | 429 |
| Step-up MFA token generation | 5 per 10 minutes per user | 429 + lockout after 3 violations |

Rate limit counters live in Redis with a sliding window algorithm. Exceeding the tenant-wide limit does not block the Platform Operations console — platform endpoints are on a separate rate limit bucket.

### 4.3 Pagination

All list endpoints use cursor-based pagination using a `cursor` parameter (an opaque base64-encoded UUIDv7 + timestamp pair). Offset pagination is not offered for security and performance reasons — offset-based queries allow enumeration attacks and become slow on large tables. Default page size is 50. Maximum page size is 200.

### 4.4 Idempotency Implementation

For all write endpoints accepting an `Idempotency-Key`, the server stores a record in the `idempotency_keys` table keyed on `(user_id, key, endpoint)` with a TTL of 24 hours. On a duplicate key, the server returns the original response from the stored result without re-executing the operation. The stored result is the full HTTP response body (compressed). This table is in Redis for hot access, mirrored to PostgreSQL for durability. A key older than 24 hours is treated as a new request.

---

## 5. Authentication and Session Architecture

### 5.1 JWT Structure

Access tokens are signed RS256 (RSA, 2048-bit) using a key stored in AWS KMS. Refresh tokens are HMAC-SHA256 signed with a secret stored in AWS Secrets Manager.

**Access Token Claims**

```
{
  "sub":         "user-uuid",
  "iss":         "https://api.loomis.ng",
  "aud":         "loomis-api",
  "iat":         unix-timestamp,
  "exp":         unix-timestamp (iat + 8 hours),
  "jti":         "token-uuid",          // unique per token; checked against blacklist
  "role":        "principal",
  "tenant_id":   "tenant-uuid | null",  // null for platform and regional actors
  "session_id":  "session-uuid",        // session record in PostgreSQL
  "user_ver":    42,                    // incremented on password change, role change, deactivation
  "mfa_at":      unix-timestamp,        // when MFA was last completed in this session
  "device_id":   "device-uuid | null"   // registered device if persistent login
}
```

The `user_ver` claim is the primary mechanism for session revocation without a token blacklist scan. On every authenticated request, the API middleware reads the user's current `user_ver` from Redis (cached from PostgreSQL, TTL 30 seconds). If the token's `user_ver` does not match the current value, the request is rejected with `401 IDENTITY_SESSION_INVALIDATED`. Events that increment `user_ver`: password change, password reset, role change, deactivation, MFA device reset.

The `jti` blacklist provides secondary enforcement for explicit session revocation (user-initiated logout from a specific device). The blacklist is a Redis sorted set keyed by expiry timestamp, allowing expired entries to be pruned automatically without a background job.

### 5.2 Refresh Token Rotation

Refresh tokens are single-use. Each use issues a new access token and a new refresh token. The old refresh token is immediately invalidated. If a refresh token is used a second time (replay attack), both the new and old token families are invalidated and the user is force-logged-out. This is token family binding — any replayed token in the family invalidates the entire family.

Refresh tokens are stored as a HMAC hash in PostgreSQL — the raw token is never stored server-side. The record links to the user, session, device, and expiry.

### 5.3 MFA Architecture

The platform uses TOTP (RFC 6238) with a 30-second time step. The TOTP secret is stored encrypted at rest using AWS KMS. On MFA setup, the user scans a QR code or copies the base32 secret. Ten one-time backup codes are generated, shown once, and stored as Argon2 hashes. Each backup code is single-use.

**MFA Enrollment Flow**

1. User initiates MFA setup; server generates 160-bit random TOTP secret, encrypts it with KMS, stores it in a pending state.
2. Server returns a provisioning URI (`otpauth://totp/...`) to the client.
3. User scans with authenticator app, enters first OTP code.
4. Server verifies the OTP. On success, the TOTP secret transitions from pending to active and the ten backup codes are generated and returned.
5. Until MFA is active, the account is locked. Session tokens issued before MFA setup carry a `mfa_enrolled: false` claim with access restricted to the MFA enrollment endpoint only.

**Step-Up MFA**

For high-risk actions (refund approval, data export, PSF rate change, census lock, result publish, ledger adjustment), the client must present an `X-MFA-Token` header containing a short-lived step-up proof. The flow:

1. Client hits the step-up token endpoint (`POST /api/v1/auth/stepup`), provides a valid TOTP code.
2. Server validates the TOTP, issues a step-up proof token (signed JWT, 5-minute expiry, scoped to a specific action category).
3. Client includes the step-up token in the target endpoint's `X-MFA-Token` header.
4. API middleware validates the step-up token action scope before routing to the handler.

### 5.4 Session Store

Sessions are stored in PostgreSQL in the `identity.user_sessions` table. Session creation is always a database write — in-memory-only sessions are not permitted because they cannot be enumerated or revoked on security events.

```
user_sessions
  id              UUID PK
  user_id         UUID NOT NULL
  device_id       UUID NULL
  ip_address      INET
  user_agent      TEXT
  issued_at       TIMESTAMPTZ NOT NULL
  last_active_at  TIMESTAMPTZ NOT NULL
  idle_expires_at TIMESTAMPTZ NOT NULL   -- issued_at + idle_timeout
  abs_expires_at  TIMESTAMPTZ NOT NULL   -- issued_at + 8h (30d for mobile)
  revoked         BOOLEAN NOT NULL DEFAULT false
  revoke_reason   VARCHAR(50)
  revoked_at      TIMESTAMPTZ
```

On each authenticated request, the middleware updates `last_active_at` and slides `idle_expires_at` forward. This update is a fire-and-forget write to a Redis sorted set (non-blocking) batched every 60 seconds into PostgreSQL by a background writer, to avoid a database write on every API call.

**Concurrent Session Enforcement**

On new session creation, the server counts non-expired, non-revoked sessions for the user. If the count equals five, the oldest session (lowest `issued_at`) is soft-revoked and its JWT ID is added to the Redis blacklist. The displaced user receives a push notification.

### 5.5 Registered Device Registry

Registered devices are tracked in `identity.registered_devices`:

```
registered_devices
  id                   UUID PK
  user_id              UUID NOT NULL
  device_fingerprint   VARCHAR(512) NOT NULL  -- client-generated, hashed
  platform             VARCHAR(20)            -- ios | android | web
  registered_at        TIMESTAMPTZ NOT NULL
  last_seen_at         TIMESTAMPTZ NOT NULL
  persistent_token_hash CHAR(64)              -- HMAC of the 32-byte persistent token
  persistent_token_expires_at TIMESTAMPTZ
  revoked              BOOLEAN NOT NULL DEFAULT false
  revoked_at           TIMESTAMPTZ
```

A persistent device token is a 32-byte random secret, shown to the client exactly once at device registration and stored as an HMAC hash server-side. The client stores it in the device's secure keychain. On subsequent logins from the same device, the client presents the persistent token and the server verifies the HMAC — if valid and not expired, MFA friction is reduced to a single tap confirmation rather than entering a TOTP code.

A persistent token does not bypass step-up MFA for high-risk actions — those always require the full TOTP code.

---

## 6. Database Architecture

### 6.1 Database Platform

**Primary:** Amazon Aurora PostgreSQL Serverless v2 (version 16.x), deployed across two Availability Zones (primary in af-south-1a, standby in af-south-1b). Aurora Serverless v2 provides 0.5 to 128 Aurora Capacity Units (ACU) per instance, scaling in steps of 0.5 ACU within seconds. This eliminates over-provisioning during low-traffic periods (nights and weekends) while handling the morning census-lock surge and report-card generation spikes without pre-warming.

**Read Replica:** One Aurora Read Replica in af-south-1b dedicated to read-heavy workloads: analytics queries, IVP snapshot computation, report generation, and the regional dashboard. The application query builder is aware of replica routing — SELECT queries carrying the `READ_REPLICA` hint are routed to the replica endpoint.

**Audit Database:** A separate Aurora PostgreSQL cluster (not serverless — fixed capacity for predictable append performance) holds `audit_events` and `data_access_events`. This cluster has no connection from the primary application role that has UPDATE or DELETE on any application table. The audit cluster is in the same VPC, different subnet group, and has a separate KMS key for encryption at rest.

**Connection Pooling:** PgBouncer runs as a sidecar container on each ECS task in transaction pooling mode. The ECS task does not open PostgreSQL connections directly — it connects to PgBouncer on localhost port 5432. PgBouncer maintains a pool of up to 100 connections to the Aurora writer endpoint. This limits the total PostgreSQL connections to `(number_of_ecs_tasks × 100) / transaction_pool_multiplier`, which stays safely within Aurora's connection limit regardless of ECS horizontal scaling.

### 6.2 Schema Layout

Each domain module owns a dedicated PostgreSQL schema. The application connects using a per-module database role that has `SELECT`, `INSERT`, `UPDATE`, `DELETE` only on its own schema, with the following exceptions:

- The `identity` module role has `INSERT`-only on `audit.audit_events` (for the audit middleware).
- The `ledger` module role has `INSERT`-only on `ledger.ledger_entries` and `SELECT`-only on all other schemas required for balance validation.
- The `risk` module role has `SELECT`-only on all schemas for IVP signal computation, plus `INSERT` on `risk.ivp_signals`.

```
Schemas
  identity        -- users, sessions, devices, mfa_configs, tokens
  tenant          -- tenants, tiers, psf_rate_snapshots, configurations
  hrm             -- staff_profiles, role_assignments, subject_assignments, invitations
  academic        -- academic_years, terms, class_arms, timetables, grading_schemes,
                  -- attendance_records, gradebook_entries, exam_configs, results
  student         -- students, admissions, enrollments, promotions, parent_links
  finance         -- fee_structures, invoices, payments, receipts, refund_requests,
                  -- webhook_events, reconciliation_exceptions
  ledger          -- psf_obligations, psf_settlements, ledger_entries, outbox_events
  risk            -- ivp_signal_snapshots, ivp_anomaly_cases, privileged_change_requests,
                  -- break_glass_sessions
  referral        -- participants, kyc_records, referral_codes, attributions,
                  -- earning_entries, payout_cycles
  comms           -- messages, notifications, push_subscriptions, notification_templates
  workflow        -- workflow_instances, workflow_steps, workflow_decisions
  compliance      -- dsars, breach_records, consent_versions, retention_schedules
  storage         -- storage_objects
  audit           -- audit_events, data_access_events (append-only; separate cluster)
  read_models     -- denormalized read projections maintained by event consumers
```

### 6.3 Row-Level Security (RLS)

Every tenant-bound table has RLS enabled. The application sets a session-level configuration variable on each connection before executing queries:

```sql
SET app.current_tenant_id = '<uuid>';
SET app.current_user_id   = '<uuid>';
SET app.current_role      = 'principal';
```

The RLS policy on every tenant-bound table:

```sql
CREATE POLICY tenant_isolation ON <table>
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

The `AS RESTRICTIVE` keyword means this policy is ANDed with all permissive policies — it cannot be bypassed by granting additional roles to the connection. The policy is also defined on PgBouncer's server-side connection setup hook so that a recycled connection from the pool always has the correct tenant context flushed and reset.

Cross-tenant queries (platform admin, DPO, IVP) use a dedicated platform connection that sets `app.current_tenant_id = null`. The RLS policy for platform connections uses a separate `platform_access` policy that permits null tenant IDs only for specific roles:

```sql
CREATE POLICY platform_access ON <table>
  AS PERMISSIVE
  FOR SELECT
  USING (
    current_setting('app.current_role') IN ('platform_admin', 'platform_owner', 'dpo')
    AND current_setting('app.current_tenant_id') IS NULL
  );
```

### 6.4 Partitioning Strategy

| Table | Partition Key | Strategy | Rationale |
|-------|--------------|----------|-----------|
| `audit.audit_events` | `created_at` | RANGE by month | Enables fast partition pruning on time-range queries; old partitions are archivable |
| `audit.data_access_events` | `created_at` | RANGE by month | Same as above |
| `finance.payments` | `created_at` | RANGE by year | Payments grow slowly relative to audit events |
| `ledger.ledger_entries` | `created_at` | RANGE by year | Ledger is append-only; historical entries rarely queried |
| `academic.attendance_records` | `(tenant_id, created_at)` | RANGE by term quarter | Attendance is queried by term within a tenant |
| `academic.gradebook_entries` | `tenant_id` | HASH (16 buckets) | Gradebook entries are heavy on write during exam periods; hash partitioning distributes load |

### 6.5 Critical Indexes

Beyond standard primary key indexes, the following non-obvious indexes are required for correctness and performance:

- `finance.payments (tenant_id, student_id, term_id, status)` — supports the outstanding-balance query used in the parent portal; must be partial (`WHERE status != 'refunded'`).
- `ledger.psf_obligations (tenant_id, term_id, status)` — the IVP pipeline scans this for unsettled obligations per tenant per term nightly.
- `student.enrollments (tenant_id, term_id, status)` — the census lock pre-check counts active billable students; must return sub-second.
- `risk.ivp_signal_snapshots (tenant_id, signal_date)` — IVP anomaly scorer reads 90 days of signals per tenant on each nightly run.
- `identity.user_sessions (user_id, revoked, abs_expires_at)` — concurrent session count check on login.
- `referral.earning_entries (participant_id, payout_cycle_id, status)` — payout cycle computation aggregates earnings per participant.

---

## 7. Event-Driven Architecture

### 7.1 Event Spine

The event spine uses a combination of **AWS SQS (for reliable point-to-point delivery)** and **AWS SNS (for fan-out to multiple consumers)**. An SNS topic per event type delivers to one or more SQS queues. Each SQS queue is consumed by the module or worker that is interested in that event.

**AWS EventBridge** is used for the scheduled rule engine: nightly IVP batch, nightly reconciliation job, daily PSF snapshot, monthly payout cycle trigger, session idle timeout sweep, and NDPA retention cleanup.

### 7.2 Event Envelope

All events conform to a CloudEvents-compatible envelope:

```
{
  "event_id":       "01HX...",       // UUIDv7 — globally unique
  "event_type":     "billing.psf_obligation.created",
  "schema_version": "1.0",
  "occurred_at":    "2026-06-05T10:00:00Z",
  "producer":       "ledger-module",
  "tenant_id":      "uuid | null",
  "aggregate_type": "psf_obligation",
  "aggregate_id":   "uuid",
  "causation_id":   "uuid",          // event_id of the event that caused this one
  "correlation_id": "uuid",          // original HTTP request X-Request-Id
  "payload":        { ... }
}
```

### 7.3 Outbox Pattern

Financial events and all cross-domain events use the Transactional Outbox pattern. The sequence:

1. The module performs its state change (e.g., create PSF obligation) and simultaneously inserts a row into `ledger.outbox_events` in the same PostgreSQL transaction.
2. The database transaction commits both the state change and the outbox record atomically. Either both commit or neither does — no split-brain.
3. The **Outbox Relay** is a dedicated ECS service that polls `outbox_events` for unprocessed rows, publishes them to the appropriate SNS topic, and marks the row as published. The poll interval is 100ms.
4. Consumers on the SQS queues receive the event and process it. They write the `event_id` to a `processed_events` table in their own schema before applying business logic.
5. If the event_id is already in `processed_events`, the consumer acknowledges the message with no action (idempotent discard).

The outbox relay processes events in strict `created_at ASC` order per aggregate to preserve causality. If the relay is down, events queue up in the outbox table but the primary write has already committed — there is no data loss, only delivery delay.

### 7.4 Dead Letter Handling

Each SQS consumer queue has a corresponding Dead Letter Queue (DLQ) with a 14-day retention. A message moves to the DLQ after 3 failed processing attempts. Financial event DLQs trigger a PagerDuty alert to Revenue Operations within 5 minutes of the first DLQ arrival. An event in a financial DLQ blocks term closure for the affected tenant until the event is resolved and manually reprocessed or explicitly dismissed by Platform Operations with audit logging.

### 7.5 Event Ordering and Causality

Events within an aggregate are ordered using the `causation_id` chain. For PSF-related events, the full causal chain is:

```
[term.census_locked]
  ├─► [billing.psf_obligation.created] (one per student)
  │     └─► [ledger.transaction.posted] (DR: school_psf_receivable, CR: psf_revenue)
  └─► [risk.signal.detected] (IVP census signal recorded)

[payment.verified]
  ├─► [billing.psf_obligation.settled]
  │     └─► [ledger.transaction.posted] (DR: cash_clearing, CR: school_psf_receivable)
  └─► [referral.earning.accrued] (if attribution exists and caps not reached)
```

---

## 8. Revenue Integrity Architecture

### 8.1 PSF Obligation Pipeline

The PSF obligation lifecycle is the financial backbone of the platform and is treated with the same rigor as a bank ledger.

**Census Lock — the trigger point.** When a School Owner or Principal hits census lock (POST /census/lock with MFA step-up), the Ledger Module executes the following within a single serializable transaction:

1. Validate pre-conditions: term is in `census_open` status; no unresolved duplicate student records; no active billing freeze on the tenant; PSF rate snapshot exists and is not zero.
2. Read all active `student.enrollments` for the term with `status = active_billable`.
3. Compute the billing count. If the declared count differs from the system count by more than 2%, require a documented variance reason.
4. Insert one `psf_obligation` record per billable student.
5. Insert balanced ledger entries: for each obligation, debit `school_psf_receivable`, credit `loomis_psf_revenue`.
6. Insert an `enrollment_attestation` record with the attester user ID, timestamp, declared count, system count, and a SHA-256 hash of the enrolled student list at that moment.
7. Update term status to `census_locked`.
8. Insert outbox events for all PSF obligations and ledger entries.
9. Commit.

Steps 1–9 are inside one `BEGIN ... COMMIT` with `ISOLATION LEVEL SERIALIZABLE`. If any step fails, the entire transaction rolls back. The PSF obligations are never partially created.

**Post-Census Enrollment.** If a student enrolls after census lock, the Finance Module creates a PSF obligation immediately on enrollment (not at the next census). The obligation uses the same PSF rate snapshot as the term's census lock. This prevents gaming by delaying a student's enrollment until after census.

**PSF Settlement.** A PSF obligation is settled when a payment is verified (offline) or a payment webhook is received and matched (online). Settlement is partial or full. The Finance Module publishes `payment.verified`. The Ledger Module consumes this and applies the settlement: debit `cash_gateway_clearing`, credit `school_psf_receivable` for the settled amount.

### 8.2 Independent Verification Pipeline (IVP)

The IVP runs as a nightly batch job (AWS EventBridge Scheduler, 02:00 UTC daily) and as a real-time signal recorder on specific events.

**Signal Types and Data Sources**

| Signal Type | Source | Trigger |
|------------|--------|---------|
| Attendance signal | `academic.attendance_records` | Students marked present who are not in the billable enrollment list |
| Gradebook signal | `academic.gradebook_entries` | Grade entries for students not in the census |
| Payment volume signal | `finance.payments` | Total fee payments materially exceed PSF revenue for the term |
| Device count signal | `identity.user_sessions` | Unique student logins exceed attested student count |
| Parent-link signal | `student.parent_links` | Active parent links for students not in the census |
| Offline payment anomaly | `finance.payments` | Spike in unverified offline cash payments in the week before census lock |

**Anomaly Scoring Model**

Each signal produces a Z-score deviation relative to the school's own historical baseline (12 terms minimum, or platform-wide baseline for new schools). The composite anomaly score is a weighted sum:

```
anomaly_score =
  (0.30 × attendance_signal_z) +
  (0.25 × payment_volume_signal_z) +
  (0.20 × gradebook_signal_z) +
  (0.15 × device_count_signal_z) +
  (0.10 × parent_link_signal_z)
```

An anomaly score above 2.0 opens an IVP case automatically. A score above 3.5 triggers an immediate alert to Platform Operations with same-day review SLA. Scores between 1.5 and 2.0 are flagged as watch-list items requiring the next term's signals to confirm before escalating.

An active IVP case holds all referral earnings for the affected tenant until the case is resolved.

### 8.3 Platform Ledger Integrity

The Ledger Module maintains a double-entry ledger. Every entry is an immutable row in `ledger.ledger_entries`. A nightly **balance check job** (EventBridge, 04:00 UTC) aggregates all ledger entries since inception and verifies:

1. The sum of all debit entries equals the sum of all credit entries (across the platform, not per tenant).
2. The PSF revenue account total equals the sum of all PSF obligations in `settled` or `partially_settled` status times the respective rates.
3. The referral payable account total equals the sum of all unpaid referral earnings.

If any check fails, Revenue Operations receives a P1 alert within 5 minutes, term closures for all tenants are blocked, and the Platform Owner is notified. This is a catastrophic failure condition — it means the ledger has been tampered with or a bug produced an unbalanced write.

---

## 9. Payment Architecture

### 9.1 Gateway Integration Pattern

The Finance Module maintains a **Gateway Abstraction Layer (GAL)** — an internal interface that all payment operations go through. The GAL knows about each configured gateway (Paystack, Flutterwave, Monnify, Remita) and handles:

- Payment initiation: return the gateway's payment URL or collect card details server-side.
- Webhook verification: HMAC signature check using the gateway's webhook secret (stored in AWS Secrets Manager; retrieved at runtime, never in code or environment variables).
- Settlement query: provider reconciliation API called daily to fetch settlement reports.
- Failover: if initiation to the primary gateway fails or returns a non-retriable error, the GAL retries on the secondary gateway within 30 seconds.

The GAL is configured per deployment region. Gateway priority order is configurable at the platform level without a deployment.

### 9.2 Webhook Processing Pipeline

Webhook events from payment gateways are high-velocity, external-origin, and potentially duplicated. The inbound pipeline:

1. Webhook hits the dedicated inbound webhook endpoint. This endpoint is IP-allowlisted per gateway.
2. The HMAC signature is verified using the gateway's public key or shared secret. A failed signature check returns 200 (to prevent gateway retry storms) but the event is logged as `signature_invalid` and is never processed further.
3. The raw webhook payload is stored in `finance.webhook_events` using an upsert on `(provider, provider_event_id)`. If the row already exists (duplicate), the endpoint returns 200 with no further action.
4. The stored event triggers an outbox relay publication. The Finance Module worker consumes the event, validates business rules, and updates the payment record.
5. All downstream effects (PSF settlement, ledger posting, parent notification) flow from the `payment.webhook.received` event on the event bus.

This pipeline ensures that no webhook event is processed twice and that signature verification happens before any business logic, regardless of how the gateway retries.

### 9.3 PSF Split Payment

For gateways that support split payments (Paystack Subaccounts, Flutterwave Split), the platform configures a split rule at onboarding: a percentage of each payment is directed to the Loomis platform account and the remainder to the school's registered account. This eliminates the settlement delay and manual transfer step.

For gateways without split support, the full payment goes to the school's account and a post-settlement transfer is triggered from the school's account to Loomis according to the PSF obligation schedule. A daily reconciliation job compares expected PSF transfers against actual received credits to the Loomis platform account.

---

## 10. Storage Architecture

### 10.1 Object Storage

All file storage is Amazon S3. No file is ever publicly accessible. All objects are stored with server-side encryption using AWS KMS (SSE-KMS), one KMS key per data classification level: `loomis-kms-public-tenant`, `loomis-kms-internal`, `loomis-kms-pii`, `loomis-kms-financial`, `loomis-kms-exam`.

Object keys are opaque: `<classification>/<year>/<month>/<uuid>` — no file name, tenant ID, or student ID appears in the object key itself. The mapping from an object to its owner is stored only in `storage.storage_objects`.

### 10.2 Upload Flow

1. Client requests a pre-signed upload URL from `POST /api/v1/storage/upload-url`. The server validates the tenant, role, and file metadata (type, size limit).
2. Server generates an S3 pre-signed PUT URL (5-minute expiry) scoped to a single specific object key.
3. Client uploads directly to S3 — the upload never passes through the application servers.
4. On S3 upload completion, an S3 Event Notification triggers a Lambda function that runs a ClamAV virus scan on the object. If the scan fails, the object is deleted and the storage record is marked as `quarantined`. The uploader is notified.
5. After a clean scan, the `storage_objects` record is marked as `available`.

### 10.3 Download Flow

1. Client requests a download from `GET /api/v1/storage/objects/:id/url`.
2. Server validates the caller's tenant and role against the `storage_objects` record.
3. Server generates an S3 pre-signed GET URL (5-minute expiry).
4. The URL is returned to the client, which fetches directly from S3 / CloudFront.
5. The server records a `storage.object.accessed` audit event regardless of whether the download succeeds.

---

## 11. Mobile Architecture

### 11.1 Offline-First Attendance and Gradebook

Class Teachers mark attendance offline on mobile. Teachers enter gradebook scores offline. The offline store is SQLite on-device, encrypted using the device's native keystore/keychain with a per-user, per-device encryption key derived from the session token using HKDF.

**Offline Queue Entry Signing.** Every offline action is signed using a per-tenant device key (ECDSA P-256) generated on first authenticated sync with the school's tenant. The private key never leaves the device. The signature covers the payload, the tenant ID, the device ID, and the timestamp. On sync, the server verifies the signature before accepting any queued action. An entry with a mismatched tenant ID or an invalid signature is rejected entirely — not partially applied.

**Conflict Resolution.** When a Class Teacher syncs queued attendance records, the server checks for conflicts: did another device or the web app already mark attendance for that class and date? Conflict resolution rules:

- If the web and mobile records agree on all students: the server accepts the sync silently.
- If there is a partial disagreement: the later timestamp wins per student. The conflict is logged.
- If the entire day's attendance was already submitted from a different session: the queued entries are rejected and the Class Teacher is shown the existing records.

Offline queue entries older than 7 days prompt the user on app open to review and resolve before the entries are auto-discarded.

### 11.2 Mobile Push Notification Architecture

Push notifications use Firebase Cloud Messaging (FCM) for Android and Apple Push Notification Service (APNs) for iOS. The Comms Module maintains a `push_subscriptions` table with a record per user per device containing the platform (ios/android), the FCM/APNs token, and the tenant context.

All push notifications are sent server-to-server — the application server sends to FCM/APNs, which delivers to the device. Push notification content must never include student financial data, grades, or PII in the notification body (which may be read in a notification preview). Deep links in notifications carry only opaque resource IDs.

Critical notifications (payment confirmation, census lock alert, security event) are sent as high-priority FCM/APNs messages to bypass delivery throttling.

### 11.3 Certificate Pinning

The iOS and Android apps implement certificate pinning for the Loomis API domain using the public key hash of the leaf TLS certificate and one backup pin. Failed pinning results in a connection error and a user-visible message directing the user to update the app. Certificate rotation follows a 30-day overlap procedure: the new certificate's public key hash is included in the app 30 days before the old certificate expires.

---

## 12. Infrastructure Architecture

### 12.1 Cloud Platform and Regions

**Primary Region:** AWS af-south-1 (Cape Town). Selected for lowest latency to Nigerian users (~100ms versus ~200ms for eu-west-1) and Africa-local data residency, which simplifies NDPA compliance arguments.

**Disaster Recovery Region:** AWS eu-west-2 (London). Chosen over eu-west-1 for regulatory posture and as the closest EU region with full Aurora Global Database support. The DR region is warm standby — it receives continuous Aurora Global Database replication (typical lag < 1 second). Promotion to active region takes 60–90 seconds for Aurora failover plus 5–10 minutes for ECS service startup.

### 12.2 Network Design

```
VPC: 10.0.0.0/16  (af-south-1)
│
├── Public Subnets  (10.0.0.0/20, 10.0.16.0/20)
│   └── Application Load Balancer
│   └── NAT Gateway (one per AZ for HA)
│
├── Private Subnets (10.0.32.0/20, 10.0.48.0/20)
│   └── ECS Fargate Tasks (application servers)
│   └── Outbox Relay Service
│   └── Background Job Workers
│
├── Data Subnets    (10.0.64.0/20, 10.0.80.0/20)
│   └── Aurora PostgreSQL (writer in 10.0.64.0/20)
│   └── Aurora PostgreSQL (reader in 10.0.80.0/20)
│   └── ElastiCache Redis (cluster mode enabled)
│
└── Isolated Subnets (10.0.96.0/20, 10.0.112.0/20)
    └── Aurora PostgreSQL Audit Cluster
    └── Secrets (no internet route; VPC endpoints only)
```

Security Groups:

- ALB SG: inbound 443 from `0.0.0.0/0`, outbound to ECS SG on port 8080.
- ECS SG: inbound from ALB SG on 8080 only; outbound to Aurora SG on 5432, Redis SG on 6379, and HTTPS to VPC endpoints for SQS, SNS, S3, Secrets Manager, KMS.
- Aurora SG: inbound from ECS SG on 5432 only; no outbound internet.
- Redis SG: inbound from ECS SG on 6379 only.

VPC Endpoints (PrivateLink) are configured for: S3, SQS, SNS, EventBridge, KMS, Secrets Manager, ECR API, and CloudWatch Logs. No traffic to AWS services crosses the public internet.

### 12.3 Compute — ECS Fargate

The application runs as Docker containers on ECS Fargate. Task definitions:

| Service | vCPU | Memory | Min Tasks | Max Tasks | Scale Trigger |
|---------|------|--------|-----------|-----------|---------------|
| API Server | 1 | 2 GB | 4 | 40 | CPU > 60% for 3 minutes |
| Outbox Relay | 0.5 | 1 GB | 2 | 4 | SQS visible messages > 500 |
| Background Workers | 1 | 2 GB | 2 | 20 | SQS visible messages > 1,000 |
| IVP Batch Processor | 2 | 4 GB | 0 | 10 | EventBridge schedule (scales to 0 after run) |
| Comms Dispatcher | 0.5 | 1 GB | 2 | 8 | SQS visible messages > 200 |

Tasks run in the Private Subnets with no public IP. The ALB in the Public Subnet routes traffic to the API Server task group.

Container images are stored in Amazon ECR. Images are scanned by Amazon Inspector on push. Images with CRITICAL or HIGH CVEs are blocked from deployment by the CI/CD pipeline.

### 12.4 Caching — ElastiCache Redis

Redis is used for:

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| Session active check (`user_ver`) | `user:ver:{user_id}` | 30 seconds |
| Token blacklist | Sorted set `token:blacklist` scored by expiry | Auto-expire via score |
| Idempotency key results | `idem:{user_id}:{key}:{endpoint}` | 24 hours |
| Rate limit counters | `rate:{type}:{key}:{window}` | Sliding window TTL |
| Persistent device token hash | `device:token:{device_id}` | 30 days |
| Session last-active batch buffer | `session:active:{session_id}` | 120 seconds |
| Feature flags | `flag:{flag_name}` | 60 seconds |
| PSF rate snapshot (hot read) | `psf:rate:{tenant_id}:{snapshot_id}` | 5 minutes |

Redis Cluster Mode is enabled with 3 shards, 2 replicas per shard (6 nodes total). This provides both horizontal read scaling and automatic failover within 60 seconds.

---

## 13. Security Architecture

### 13.1 Defence-in-Depth Layers

```
Layer 1: AWS Shield Standard + WAF
         DDoS protection; OWASP Core Rule Set; custom rules for
         login brute force, scanner signatures, and gateway IP allowlists.

Layer 2: CloudFront
         Edge TLS termination; cache non-authenticated static assets;
         geo-restriction if required.

Layer 3: ALB
         TLS 1.2+ enforced; HTTP to HTTPS redirect; listener rules
         route /webhook/paystack to webhook-specific rate limit bucket.

Layer 4: Kong API Gateway
         JWT signature validation (RS256, public key fetched from JWKS
         endpoint backed by KMS); tenant header injection; rate limiting;
         request ID stamping; IP extraction into X-Forwarded-For
         (single hop trust).

Layer 5: Application (Controller Layer)
         RBAC enforcement: role claim from JWT against endpoint permission
         table; ABAC enforcement for cross-tenant actors;
         tenant ID in JWT claim vs X-Tenant-Id header cross-check.

Layer 6: Application (Service Layer)
         Business rule enforcement: segregation of duties (cashier cannot
         verify own payment); PSF rate zero block; concurrent session
         limit; idempotency key check before any state change.

Layer 7: Database
         RLS RESTRICTIVE policy on all tenant-bound tables;
         schema-level grants per module role; audit table INSERT-only role;
         ledger table INSERT-only role; no DDL from application roles.
```

### 13.2 Secrets Management

All secrets (database passwords, gateway webhook secrets, JWT signing keys, TOTP encryption keys, HMAC keys) are stored in AWS Secrets Manager. The application retrieves secrets at startup using the IAM role attached to the ECS task. Secrets are cached in memory for 5 minutes; after that, the next secret use triggers a background refresh. Rotation:

- Database passwords: rotated every 90 days automatically via Secrets Manager Lambda rotation.
- JWT RS256 key pair: rotated every 180 days with a 30-day overlap (old key remains valid for 30 days to drain existing sessions).
- Gateway webhook secrets: rotated at least every 12 months or immediately on suspected compromise.

Secrets are never written to application logs, CloudWatch Logs, environment variables in ECS task definitions, or source code. They are passed to the application via the Secrets Manager API only.

### 13.3 Encryption Key Management

AWS KMS manages all encryption keys. Key hierarchy:

```
AWS KMS
  loomis-kms-rds          -- Aurora at-rest encryption
  loomis-kms-redis        -- ElastiCache at-rest encryption
  loomis-kms-s3-pii       -- S3 SSE-KMS for PII-classified objects
  loomis-kms-s3-financial -- S3 SSE-KMS for financial documents
  loomis-kms-s3-exam      -- S3 SSE-KMS for exam papers
  loomis-kms-s3-internal  -- S3 SSE-KMS for internal documents
  loomis-kms-totp         -- TOTP secret envelope encryption
  loomis-kms-jwt          -- JWT RS256 key backing (asymmetric CMK)
```

All KMS keys have automatic annual rotation enabled. KMS API calls are logged to CloudTrail. Access to each KMS key is granted via a key policy that allows only the specific IAM roles that need it. No KMS key has a wildcard principal.

### 13.4 Security Headers

The API and web application set the following HTTP security headers on every response:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 13.5 Penetration Testing and Vulnerability Disclosure

A third-party penetration test is required before production launch. Critical and High findings must be remediated before go-live. A responsible disclosure contact (`security@loomis.ng`) and policy are published before launch. Annual penetration tests are scheduled. Findings are tracked in a dedicated security remediation log with SLAs: Critical within 24 hours, High within 7 days, Medium within 30 days, Low within 90 days.

---

## 14. Observability Architecture

### 14.1 Structured Logging

All application logs are emitted as JSON to stdout (ECS captures to CloudWatch Logs). Every log line includes:

```json
{
  "timestamp":      "2026-06-05T10:00:00.123Z",
  "level":          "info",
  "service":        "loomis-api",
  "module":         "finance",
  "request_id":     "uuid",
  "tenant_id":      "uuid | null",
  "user_id":        "uuid | null",
  "message":        "payment.verified",
  "duration_ms":    45,
  "http_status":    200,
  "error_code":     null
}
```

PII and financial data are never included in log messages. Student names, phone numbers, amounts, and account numbers are replaced with opaque identifiers in logs. The mapping from opaque identifier to actual value is available only by querying the database with appropriate authorization.

Logs are streamed from CloudWatch Logs to an OpenSearch cluster (retained 90 days hot, 1 year cold on S3) for full-text search and alert queries. Financial and audit log streams are retained for 5 years per CON-007.

### 14.2 Distributed Tracing

OpenTelemetry SDK is instrumented in the application. Traces are exported to AWS X-Ray. Every inbound HTTP request creates a root span. Database queries, external HTTP calls (gateway APIs, email, SMS), SQS publish operations, and Redis commands are child spans. The `correlation_id` (from `X-Request-Id`) is propagated as a trace attribute, allowing correlation between traces, logs, and audit events.

### 14.3 Metrics

Custom metrics are emitted to CloudWatch using the Embedded Metrics Format (EMF). Key metrics:

| Metric | Namespace | Dimensions |
|--------|-----------|------------|
| `api.request.duration_ms` | `Loomis/API` | endpoint, method, status_code |
| `payment.webhook.processing_ms` | `Loomis/Finance` | gateway, status |
| `psf.obligation.created.count` | `Loomis/Revenue` | tenant_id |
| `ivp.anomaly.score` | `Loomis/Risk` | tenant_id |
| `session.concurrent.count` | `Loomis/Identity` | — |
| `outbox.relay.lag_ms` | `Loomis/Events` | topic |
| `db.pool.wait_ms` | `Loomis/Database` | module |
| `cache.hit.ratio` | `Loomis/Cache` | key_type |

### 14.4 Alerting

CloudWatch Alarms trigger PagerDuty notifications. Severity tiers:

| Severity | Examples | Response SLA |
|----------|---------|--------------|
| P1 — Critical | Ledger balance check failed; financial DLQ message arrived; platform unreachable | 15 minutes |
| P2 — High | IVP batch failed; payment reconciliation discrepancy > 10 items; cert pin failure spike | 1 hour |
| P3 — Medium | API p95 latency > 1s for 5 minutes; Redis memory > 80%; ECS tasks restarting | 4 hours |
| P4 — Low | Log ingestion delay; backup job completed late | Next business day |

Sentry is integrated for unhandled exception tracking. Each exception carries the request ID, user ID (anonymised), and module name. Sentry alerts fire to the engineering Slack channel and to PagerDuty for repeated occurrences.

---

## 15. Disaster Recovery and High Availability

### 15.1 Multi-AZ Design

Every stateful component is Multi-AZ:

- Aurora PostgreSQL: writer in af-south-1a, standby replica in af-south-1b. Failover is automatic (60–120 seconds). Applications use the Aurora cluster endpoint which automatically routes to the writer.
- ElastiCache Redis: Multi-AZ replication group with automatic failover.
- ECS Fargate: tasks are spread across af-south-1a and af-south-1b via task placement constraints. ALB routes to both AZs.
- S3: automatically Multi-AZ by design.

A single AZ failure does not cause a service outage. The platform continues operating on the remaining AZ while AWS restores the failed AZ.

### 15.2 Aurora Global Database (Cross-Region DR)

Aurora Global Database replicates from af-south-1 to eu-west-2 with a typical lag of under 1 second. In the DR region, a standby Aurora cluster receives continuous replication but is not writable until promotion.

**DR Failover Procedure:**

1. P1 alert fires: primary region is degraded or unreachable.
2. On-call engineer promotes eu-west-2 Aurora cluster to writer (takes ~60 seconds, introduces up to 1 second of data loss — within the 1-hour RPO).
3. ECS tasks in eu-west-2 (pre-warmed, running at minimum capacity) start up and connect to the now-primary database (5–10 minutes to reach full capacity — within the 4-hour RTO).
4. DNS is updated to route traffic to eu-west-2 ALB (Route 53 health check failover, propagates within 60 seconds).
5. Once primary region recovers, replication is re-established from eu-west-2 back to af-south-1, then a planned failback is executed during a low-traffic window.

### 15.3 Backup Strategy

| Asset | Method | Frequency | Retention |
|-------|--------|-----------|-----------|
| Aurora PostgreSQL | Automated Aurora snapshots | Daily | 30 days |
| Aurora PostgreSQL | Continuous PITR | Continuous | 7 days (to any second) |
| Aurora Audit Cluster | Automated Aurora snapshots | Daily | 5 years (regulatory) |
| S3 Objects | S3 Versioning + Cross-Region Replication to eu-west-2 | Real-time | Indefinite (classification-dependent) |
| Application Config | GitOps — Terraform in Git | On change | Git history |
| Secrets Manager | Versioned rotation history | On rotation | 30 versions |

Backup restoration is tested quarterly. A full restoration drill into a staging environment is performed twice annually.

---

## 16. Scalability Design

### 16.1 Horizontal Scaling Approach

The application tier scales horizontally without any stateful coordination between instances. Session state lives in Redis and PostgreSQL, not in the application process memory. Feature flags and configuration are read from Redis with a 60-second TTL. No sticky session routing is required at the ALB.

The primary horizontal scaling constraint is the PostgreSQL writer connection count. PgBouncer in transaction pooling mode means 40 ECS tasks share a pool of 100 actual PostgreSQL connections. With 40 tasks, each task holds an average of 2.5 database connections — well within Aurora's connection limit.

### 16.2 Database Scaling

**Write Scaling:** Aurora's single-writer architecture means all writes go to one instance. For the census lock event (up to 5,000 INSERT statements per tenant in 30 seconds), the PSF obligation creation is batched using a multi-row INSERT. The expected throughput for the aurora writer at 2 ACU is approximately 2,000–5,000 simple INSERTs per second — sufficient for simultaneous census locks from up to 20 large schools without queuing.

**Read Scaling:** The read replica handles all analytics, IVP batch reads, report generation, and the regional dashboard. These are routed via the Aurora reader endpoint. If a single read replica becomes a bottleneck, Aurora allows up to 15 read replicas on a cluster.

**Future Partitioning:** If individual tenant datasets exceed 100 GB (unlikely within 5 years for an EdTech platform), tenant-level logical partitioning can be introduced by adding a `tenant_shard_id` to the tenant configuration and routing the tenant's queries to a different Aurora cluster. This requires no application code changes if the PgBouncer routing layer is parameterised by `app.current_tenant_id`.

### 16.3 Caching Strategy

The Redis cache is the first line of defense against database read pressure. Every identity check (`user_ver`), every PSF rate lookup, and every active-session count query hits Redis first. The expected cache hit ratio for `user_ver` is above 95% under normal load (the value changes only on security events; reads happen on every API request).

Cache invalidation follows a **write-through** strategy: whenever a value is updated in PostgreSQL (e.g., `user_ver` incremented), the Redis key is simultaneously updated in the same service function call. There is no background cache invalidation loop that could produce stale reads after a password change.

---

## 17. CI/CD Pipeline

### 17.1 Branching Strategy

| Branch | Purpose | Merge Requirement |
|--------|---------|-------------------|
| `main` | Production state | PR review; all tests pass; image scan clean |
| `staging` | Pre-production integration | PR from feature or release branch; integration tests pass |
| `feature/*` | Feature development | Created from `main`; merged to `staging` first |
| `hotfix/*` | Critical production fixes | Created from `main`; merged to `main` directly after emergency review |

### 17.2 Pipeline Stages

```
Git push to feature/* branch
  │
  ▼
GitHub Actions — CI Pipeline
  ├── Unit tests (Jest / pytest)
  ├── Integration tests (Docker Compose with real Postgres + Redis)
  ├── Linting and type checking
  ├── Security scan (Snyk — dependencies; Semgrep — SAST)
  └── Build Docker image → push to ECR staging repository
        │
        ▼
  Amazon Inspector — image vulnerability scan
        │
        ▼
  If CRITICAL/HIGH CVE → pipeline blocked; alert to security team
  If clean → image tagged with commit SHA
        │
        ▼
PR merged to staging
  │
  ▼
GitHub Actions — Deploy to Staging
  ├── Run database migrations (Flyway, checksummed, non-destructive only)
  ├── Deploy to ECS staging cluster (blue/green via CodeDeploy)
  ├── Smoke tests against staging (10 critical user journey tests)
  └── Notify engineering Slack channel
        │
        ▼
PR to main (release candidate)
  │
  ▼
Required approvals: 2 engineers + 1 architect
All staging tests green, no open P1 or P2 alerts
  │
  ▼
GitHub Actions — Deploy to Production
  ├── Run database migrations (same checksummed Flyway scripts)
  ├── Deploy to ECS production cluster (blue/green; 10% canary for 10 minutes)
  ├── CloudWatch alarm monitors canary for error rate > 0.1%
  ├── If alarm triggers → automatic rollback to previous task definition
  └── If alarm quiet → shift 100% traffic to new version; notify stakeholders
```

### 17.3 Database Migration Policy

All schema changes use Flyway versioned migrations. Rules enforced in CI:

- No `DROP TABLE` or `DROP COLUMN` in a forward migration — use soft deletion (add a `deleted_at` column, then a later migration drops the column in the next release after verifying no code references it).
- No `NOT NULL` column without a `DEFAULT` — new non-nullable columns must have a default value to support zero-downtime migrations.
- No migration that locks a table for more than 1 second — large index creates use `CREATE INDEX CONCURRENTLY`.
- Migrations are reviewed by the Database Engineer before merge.

---

## 18. Third-Party Integration Architecture

### 18.1 Payment Gateways

| Gateway | Integration Method | Webhook Auth | PSF Split |
|---------|------------------|--------------|-----------|
| Paystack | REST API + Webhooks | X-Paystack-Signature HMAC-SHA512 | Subaccount split |
| Flutterwave | REST API + Webhooks | Verif-Hash header | Split payment |
| Monnify | REST API + Webhooks | HMAC-SHA512 | Settlement split |
| Remita | REST API + Polling | Custom signature | Post-settlement transfer |

All gateway API keys are stored per-tenant in Secrets Manager. The GAL retrieves the correct key pair per tenant per gateway at request time. Gateway API calls are made over HTTPS from the Private Subnet via NAT Gateway. Gateway IPs are allowlisted at the WAF for webhook inbound traffic.

### 18.2 Email — AWS SES

AWS SES is the primary email provider. SES is configured with:

- A dedicated sending identity (domain verified via DKIM/SPF/DMARC for `mail.loomis.ng`).
- Bounce and complaint notifications routed to SNS → SQS → Comms Module to suppress undeliverable addresses.
- SES Sending Quotas monitored via CloudWatch. Transactional email (OTP, receipts, alerts) is prioritised over bulk email (announcements).
- SendGrid is the fallback email provider. Failover is triggered when SES bounce rate exceeds 5% or if the SES sending quota is projected to be exhausted.

### 18.3 SMS — Termii / Africa's Talking

Termii is the primary SMS gateway for Nigeria (best local delivery rates). Africa's Talking is the fallback. OTP SMS messages are sent with a 5-minute delivery SLA. Failed delivery triggers a retry via the fallback gateway automatically. SMS content never includes account passwords, JWT tokens, or raw referral codes.

### 18.4 Push — FCM and APNs

The Comms Module maintains FCM and APNs HTTP/2 connections as long-lived connection pools. Device tokens that receive a `NotRegistered` (FCM) or `BadDeviceToken` (APNs) response are immediately deregistered from `comms.push_subscriptions` to prevent wasted delivery attempts. Token refresh events from FCM are handled via the FCM token refresh callback in the mobile app, which calls `PATCH /api/v1/devices/:id/push-token` to update the server record.

---

## 19. NDPA Compliance Architecture

### 19.1 Data Residency

Primary data storage is in AWS af-south-1 (South Africa). Aurora Global Database replication to eu-west-2 is for disaster recovery only — the DR cluster is never the active writer except during a declared DR event. S3 Cross-Region Replication to eu-west-2 is for backup purposes. The privacy policy discloses both the primary storage location and the DR replication destination.

### 19.2 Data Retention Engine

The Compliance Module maintains a `retention_schedules` table defining the retention period for each data category (student records, financial records, audit logs, parent PII, staff PII). A nightly EventBridge job invokes the retention processor, which:

1. Identifies records past their retention period.
2. For personal data with no ongoing legal hold: soft-deletes the record (sets `anonymised_at` timestamp) and replaces PII fields with anonymised tokens (name → `ANON-{uuid}`, phone → null, email → null).
3. For financial records that must be retained 7 years under tax law: retains the record but anonymises personal identifiers while keeping amounts, dates, and aggregate references.
4. Logs every anonymisation action as an immutable `compliance.retention_events` record.

Actual deletion (hard delete) from production tables follows 90 days after anonymisation — this provides a recovery window if a retention rule was applied incorrectly. After 90 days, a DELETE job runs against the anonymised records.

### 19.3 DSAR Technical Pipeline

When a DSAR is submitted, the Compliance Module triggers a data collection job that:

1. Queries every schema for records associated with the data subject's verified identifiers (email, phone, student ID, parent ID).
2. Assembles a structured JSON data package per schema, with PII clearly labelled.
3. Reviews each third-party reference (school communications, anonymised analytics) to determine if a third party's data must be redacted before disclosure.
4. Assembles the final data package into a PDF report (encrypted, password shared with the requester by separate channel).
5. Records the DSAR fulfillment with the data categories included and the response date.

The DSAR response deadline is 30 days. The system sends an escalation alert at day 21 and a final alert at day 28 if the case is not resolved.

### 19.4 Breach Detection and Notification

The Risk Module monitors for signals that may indicate a data breach: unexpected cross-tenant data access in audit logs, bulk export outside normal patterns, admin role privilege escalation without a support ticket, and anomalous geographic access. A confirmed or suspected breach triggers:

1. Automatic creation of a `compliance.breach_records` entry.
2. Immediate P1 alert to the DPO and Platform Owner.
3. The 72-hour NDPC notification clock begins from the DPO's acknowledgement of the breach record.
4. The platform generates a pre-filled NDPC notification draft (incident summary, affected data categories, estimated record count, containment measures taken).
5. If the DPO does not act on the breach record within 48 hours, a P1 escalation goes to the Platform Owner.

---

## Appendix A: Technology Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Framework | Node.js + Fastify (TypeScript) or Python + FastAPI | Fastify for raw throughput; FastAPI for rapid schema validation; decision based on team familiarity |
| Database | Amazon Aurora PostgreSQL 16 (Serverless v2) | ACID, RLS, JSON support, Aurora fast failover, serverless cost model |
| Cache / Session | Amazon ElastiCache Redis 7 (Cluster Mode) | Sub-millisecond session and blacklist lookups |
| Event Bus | AWS SQS + SNS + EventBridge | Managed, durable, fan-out capable, native AWS integration |
| Compute | AWS ECS Fargate | No server management; per-task billing; integrates with ECR, ALB, Secrets Manager |
| Container Registry | Amazon ECR | Native ECS integration; image scanning via Inspector |
| Object Storage | Amazon S3 + SSE-KMS | Private buckets; SSE-KMS per classification |
| CDN | Amazon CloudFront | Edge TLS termination; static asset caching |
| WAF | AWS WAF | OWASP rules; rate limiting; gateway IP allowlisting |
| DNS and Failover | Amazon Route 53 | Health-check-based failover to DR region |
| API Gateway | Kong Gateway (self-hosted on ECS) | JWT validation; rate limiting; request transformation |
| Secrets | AWS Secrets Manager | Automatic rotation; IAM-bound access; versioned history |
| Key Management | AWS KMS | Envelope encryption; automatic rotation; CloudTrail logged |
| Monitoring | Amazon CloudWatch + OpenSearch + Sentry | Metrics, logs, traces, error tracking |
| Tracing | OpenTelemetry → AWS X-Ray | End-to-end request tracing |
| CI/CD | GitHub Actions + AWS CodeDeploy | Blue/green ECS deployment; canary rollout |
| IaC | Terraform | Infrastructure as code; GitOps; state in S3 + DynamoDB lock |
| Mobile | React Native (iOS + Android) | Single codebase; native modules for biometrics and keychain |
| PDF Generation | Puppeteer (headless Chromium) on ECS | Server-side report card generation |
| Email | AWS SES (primary) + SendGrid (fallback) | Nigerian delivery rate; DKIM/DMARC verified |
| SMS | Termii (primary) + Africa's Talking (fallback) | Best-in-class Nigeria delivery; local number support |
| Push | FCM (Android) + APNs (iOS) | Industry standard; platform-native delivery guarantees |
| DB Migrations | Flyway | Checksummed, ordered, non-destructive migration policy |
| Connection Pooling | PgBouncer (transaction mode, sidecar) | Prevents connection exhaustion under ECS horizontal scale |

---

## Appendix B: Capacity Planning Baseline (Year 1)

| Metric | Assumption | Implication |
|--------|-----------|-------------|
| Schools (tenants) | 500 at launch; 2,000 by end of Year 1 | 2,000 tenant configurations in Redis; 2,000 RLS contexts |
| Students per school | Average 400; largest school 3,000 | 800,000 total enrolled students; up to 3,000 PSF obligations in a single census lock |
| Daily active users | 30% of parents (240,000) + 10,000 staff | ~250,000 DAU |
| Peak concurrent users | Census lock day for large school + result day | Up to 50,000 concurrent (per NFR-PERF-006) |
| API requests per day | 10 million (50 per DAU on average) | 116 requests/second average; peak 5× = 580 req/s |
| Events per day | 30 million (3× API requests) | Outbox relay processes ~350 events/second at peak |
| Database write IOPS | Census lock: 3,000 INSERTs in 30 seconds = 100 IOPS peak | Aurora 2 ACU handles 1,000+ simple IOPS; no bottleneck |
| S3 storage (Year 1) | 500,000 documents at average 500 KB | ~250 GB; negligible cost |

---

*Loomis System Design v1 — Authoritative engineering specification for platform implementation. Supersedes any informal architectural notes or prior design sketches. All implementation work shall reference this document. Deviations require an Architecture Decision Record (ADR) to be written and approved before implementation begins.*
