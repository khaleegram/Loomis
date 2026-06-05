# Loomis Platform — Frontend Architecture Document v1

**Classification:** Production-Grade Frontend Engineering Specification
**Date:** 05 June 2026
**Authored by:** Principal Frontend Architect (Deep Architectural Reasoning)
**Basis:** Loomis SRS v3 · System Design v1 · Revenue Integrity Architecture FINAL · User Stories v1 · Cursor Rules
**Covers:** Web application (Next.js 15) · Mobile application (Expo React Native) · Shared frontend packages

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 05/06/2026 | Frontend Architecture | Initial full frontend architecture: monorepo layout, web and mobile app architecture, shared API client, auth and session handling, state management, design system, role-based rendering, offline-first mobile, forms and validation, error handling, performance, accessibility, i18n, testing, and build/release |

---

## 0. Architectural Reasoning — Why These Choices

Before any structure, the reasoning. Every decision below is anchored to a Loomis-specific constraint, not generic best practice.

**Constraint 1 — 16 distinct roles, each seeing a different application.** A Parent's app and a Platform Owner's console share almost no screens. This forces a *role-partitioned routing architecture* rather than one monolithic UI with conditional hiding. Hiding a button client-side is not security (the server enforces that), but rendering 16 roles' worth of UI into one bundle is a performance and maintenance disaster. We partition by role at the route-group level.

**Constraint 2 — Mobile is the primary interface for Parents, Students, Class Teachers, and Teachers (SRS ASM-009), and must work offline (attendance, gradebook drafts).** This makes the mobile app *offline-first*, not *online-with-cache*. The local SQLite store is the source of truth for queued actions; the server is the source of truth for confirmed state. The two reconcile through a signed sync protocol. This is the single most defining mobile decision.

**Constraint 3 — The backend is strongly typed end-to-end (Zod + Drizzle).** Throwing that type safety away at the network boundary is negligent. We share Zod schemas between backend and frontend through a `packages/contracts` package, so a change to a payment request shape is a compile error on the frontend, not a runtime 422.

**Constraint 4 — Financial and high-risk actions require step-up MFA and idempotency keys.** The frontend is not a passive form renderer for these flows. It must generate idempotency keys, hold them across retries, drive the step-up MFA challenge inline, and never double-submit. This is a *client-side financial safety* concern that shapes the data-mutation layer.

**Constraint 5 — Tenant isolation and session revocation are real-time.** A role change or deactivation invalidates sessions server-side via `user_ver`. The client must handle a sudden `401 IDENTITY_SESSION_INVALIDATED` gracefully from any screen — not crash, not loop — and route the user to re-authentication while preserving any unsynced offline work.

These five constraints drive the entire architecture below.

---

## 1. Monorepo Structure

Loomis frontend and backend live in a single **Turborepo** monorepo. The reason is type sharing: the contracts package is consumed by the API, the web app, and the mobile app simultaneously, and Turborepo's task graph caches builds so only changed packages rebuild.

```
loomis/
├── apps/
│   ├── api/                  -- Fastify backend (from System Design)
│   ├── web/                  -- Next.js 15 web application
│   └── mobile/               -- Expo React Native application
│
├── packages/
│   ├── contracts/            -- Zod schemas + inferred TS types (shared API contract)
│   ├── api-client/           -- Typed HTTP client + TanStack Query hooks (shared web+mobile)
│   ├── core/                 -- Pure domain logic: money formatting, date/term helpers,
│   │                            role capability maps, validation rules (no UI, no I/O)
│   ├── ui-web/               -- Web design system (Shadcn/UI + Tailwind components)
│   ├── ui-mobile/            -- Mobile design system (NativeWind components)
│   ├── design-tokens/        -- Shared colors, spacing, typography scale (platform-agnostic)
│   └── config/               -- Shared ESLint, TypeScript, Prettier, Tailwind base configs
│
├── drizzle/                  -- DB migrations (owned by apps/api)
├── .cursor/rules/            -- AI guidance rules (already created)
├── turbo.json                -- Turborepo task pipeline
├── package.json              -- Root workspace
├── pnpm-workspace.yaml        -- pnpm workspaces (pnpm is the package manager)
└── docker-compose.yml        -- Local Postgres + Redis
```

### 1.1 Why pnpm + Turborepo

- **pnpm** uses a content-addressed store and symlinks, which is essential for a monorepo with React Native — npm/yarn duplicate `node_modules` and Metro bundler chokes on duplication. pnpm's strictness also prevents phantom dependencies (a package using something it didn't declare).
- **Turborepo** gives a cached task graph. `turbo run build` rebuilds only what changed. `turbo run typecheck` across all packages catches a contract change breaking the mobile app before it's committed.

### 1.2 Dependency Direction (strict — enforced by ESLint)

```
design-tokens  ──►  ui-web, ui-mobile
contracts      ──►  api-client, core, api
core           ──►  api-client, web, mobile
api-client     ──►  web, mobile
ui-web         ──►  web
ui-mobile      ──►  mobile
```

`contracts` and `design-tokens` are leaf packages — they depend on nothing internal. `web` and `mobile` are roots — nothing depends on them. A dependency that points "backwards" (e.g., `contracts` importing from `web`) is an ESLint error. This keeps the shared layer pure and reusable.

---

## 2. The Shared Contract Layer (`packages/contracts`)

This is the keystone of the whole architecture. It is the single source of truth for every API request and response shape.

```
packages/contracts/src/
  common/
    pagination.ts      -- CursorPage<T>, PaginationQuery
    errors.ts          -- LoomisErrorCode union (all namespaced codes)
    envelope.ts        -- ApiResponse<T> success/error envelope
  identity/
    auth.schema.ts     -- LoginRequest, LoginResponse, StepUpRequest, etc.
    session.schema.ts  -- SessionDto, DeviceDto
  finance/
    payment.schema.ts  -- LogOfflinePaymentRequest, VerifyPaymentRequest, PaymentDto
  academic/
    census.schema.ts   -- CensusLockRequest, CensusLockResponse
  ... (one folder per backend module)
  index.ts
```

Each schema file exports the Zod schema AND the inferred type:

```typescript
// packages/contracts/src/finance/payment.schema.ts
import { z } from 'zod';

export const logOfflinePaymentRequest = z.object({
  termId: z.string().uuid(),
  studentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  channel: z.enum(['cash', 'bank_transfer', 'pos']),
  amountMinor: z.number().int().positive(),   // kobo
  currency: z.literal('NGN'),
  receivedAt: z.string().datetime(),
  evidence: z.array(z.object({
    type: z.literal('receipt_image'),
    storageObjectId: z.string().uuid(),
  })).optional(),
});

export type LogOfflinePaymentRequest = z.infer<typeof logOfflinePaymentRequest>;
```

The backend imports `logOfflinePaymentRequest` for route validation. The frontend imports `LogOfflinePaymentRequest` for the form type AND `logOfflinePaymentRequest` for client-side validation before submit. One change, both sides update, compiler enforces it.

**This is how we make "the AI stops breaking things" real at the type level** — a frontend that builds a request the backend will reject simply does not compile.

---

## 3. The Shared API Client (`packages/api-client`)

Both web and mobile talk to the backend through one typed client. This client is where all the cross-cutting request concerns live: auth headers, tenant header, idempotency keys, request IDs, retry, token refresh, and error normalisation.

### 3.1 Layered Design

```
packages/api-client/src/
  http/
    client.ts          -- low-level fetch wrapper (platform-injected fetch + storage)
    interceptors.ts    -- auth header, tenant header, request-id, idempotency
    refresh.ts         -- refresh-token rotation + single-flight refresh lock
    errors.ts          -- maps HTTP errors to typed LoomisError instances
  query/
    keys.ts            -- TanStack Query key factory (typed, hierarchical)
    hooks/             -- one file per module: usePayments, useStudents, useCensus...
  mutations/
    useFinancialMutation.ts  -- special mutation wrapper (idempotency + step-up MFA)
  index.ts
```

### 3.2 Platform Injection

The client is platform-agnostic. Web and mobile inject their own `fetch`, token storage, and device info:

```typescript
// The client is created once per app with platform adapters
export interface ApiClientConfig {
  baseUrl: string;
  tokenStore: TokenStore;         // web: httpOnly cookie proxy; mobile: SecureStore
  deviceInfo: () => DeviceInfo;   // device id, platform, fingerprint
  onSessionInvalidated: () => void; // web: redirect /login; mobile: reset nav stack
}
```

This is why web (which stores tokens in httpOnly cookies via a Next.js route handler) and mobile (which stores tokens in Expo SecureStore / Keychain) can share 100% of the request logic while differing only in the storage adapter.

### 3.3 Request Interceptor Pipeline (every request)

1. Attach `Authorization: Bearer <accessToken>` from the token store.
2. Attach `X-Tenant-Id` if the active tenant context is set (parents/platform actors may have none).
3. Generate and attach `X-Request-Id` (UUIDv7) for tracing — logged on both client and server.
4. For financial/workflow writes: attach the caller-supplied `Idempotency-Key`.
5. Attach `X-MFA-Token` if a step-up proof is present for this action.

### 3.4 Token Refresh — Single-Flight

When a request returns `401` due to an expired (not invalidated) access token, the client must refresh — but if ten requests fire simultaneously and all get 401, we must NOT fire ten refresh calls (which would invalidate each other under the rotation scheme).

The client uses a **single-flight refresh lock**: the first 401 triggers a refresh; all concurrent 401s await the same in-flight refresh promise, then retry with the new token. If the refresh itself fails (refresh token expired or replayed), the client calls `onSessionInvalidated()` and aborts all queued requests.

### 3.5 Distinguishing the Two 401s

This is critical and easy to get wrong:

| Server Response | Meaning | Client Action |
|----------------|---------|---------------|
| `401` + `error.code = IDENTITY_TOKEN_EXPIRED` | Access token aged out | Attempt single-flight refresh, retry |
| `401` + `error.code = IDENTITY_SESSION_INVALIDATED` | `user_ver` bumped (password/role change, deactivation) or blacklisted | Do NOT refresh — hard logout, preserve offline queue, route to login |

Confusing these two causes infinite refresh loops on a revoked session. The client switches on `error.code`, never on the bare status.

---

## 4. State Management Strategy

A deliberate three-tier split. The biggest frontend mistake is putting everything in one global store. We separate by data lifecycle.

| State Type | Tool | Examples | Rationale |
|-----------|------|----------|-----------|
| **Server state** | TanStack Query v5 | Students, payments, results, dashboards | The server owns it; we cache, invalidate, and refetch. Never duplicate into a global store. |
| **Client/UI state** | Zustand | Active tenant context, sidebar open, theme, multi-step form drafts | Small, synchronous, app-global, non-server |
| **Form state** | React Hook Form | Every form | Local to the form; uncontrolled inputs for performance |
| **Offline queue (mobile)** | SQLite + Zustand bridge | Queued attendance, gradebook drafts | Durable across app restarts; the offline source of truth |

### 4.1 Why Not Redux

Redux's global mutable store is the wrong model for an app that is 80% server state. TanStack Query already solves caching, deduplication, background refetch, optimistic updates, and stale-while-revalidate. Putting server data in Redux means manually re-implementing all of that and keeping it in sync. We use Zustand only for the genuinely-global *client* state, which is small.

### 4.2 The Active Tenant Context (Zustand)

A Parent has multiple children across multiple schools. A Platform Admin operates across all tenants. The "active tenant" is client UI state that determines which `X-Tenant-Id` header the API client attaches.

```typescript
// packages/core has the type; each app has its own store instance
interface TenantContextStore {
  activeTenantId: string | null;
  activeChildId: string | null;     // for parents
  setActiveTenant: (tenantId: string) => void;
  clear: () => void;
}
```

When a Parent switches from Child A (School X) to Child B (School Y), the store updates `activeTenantId`, and TanStack Query keys (which include the tenant ID) automatically scope to the new tenant. No cross-tenant data leaks into the cache because the cache key itself is tenant-partitioned (see §5.2).

---

## 5. Data Fetching with TanStack Query

### 5.1 Query Key Factory

All query keys come from a typed factory so they are consistent and refactor-safe:

```typescript
// packages/api-client/src/query/keys.ts
export const queryKeys = {
  students: {
    all: (tenantId: string) => ['students', tenantId] as const,
    list: (tenantId: string, filters: StudentFilters) =>
      ['students', tenantId, 'list', filters] as const,
    detail: (tenantId: string, studentId: string) =>
      ['students', tenantId, 'detail', studentId] as const,
  },
  payments: {
    list: (tenantId: string, termId: string) =>
      ['payments', tenantId, termId] as const,
  },
  // ...
};
```

### 5.2 Tenant-Partitioned Cache (security-critical)

Every tenant-scoped query key includes `tenantId` as the second element. This guarantees that data for School X is cached under a different key than School Y. When a parent switches children, queries for the new tenant either hit a separate cache entry or fetch fresh. **There is no code path where School X's cached students could be read while School Y is the active tenant**, because the key wouldn't match.

On hard logout / session invalidation, the client calls `queryClient.clear()` to purge ALL cached data — no stale tenant data survives a logout.

### 5.3 Stale Times by Data Volatility

```typescript
// Reference / rarely-changing data — long stale time
useQuery({ queryKey: ..., staleTime: 5 * 60_000 });  // grading schemes, fee structures

// Operational data — short stale time
useQuery({ queryKey: ..., staleTime: 30_000 });       // attendance, payments

// Real-time-ish — always refetch on focus
useQuery({ queryKey: ..., staleTime: 0, refetchOnWindowFocus: true }); // dashboards
```

---

## 6. Financial Mutations — The Safety-Critical Path

Regular mutations and financial mutations are NOT the same. Financial mutations get a dedicated wrapper that enforces idempotency and step-up MFA.

```typescript
// packages/api-client/src/mutations/useFinancialMutation.ts
export function useFinancialMutation<TReq, TRes>(config: {
  endpoint: string;
  action: StepUpAction;            // e.g. 'refund_approve', 'census_lock'
  invalidates: QueryKey[];
}) {
  // 1. Generate ONE idempotency key when the mutation form mounts (not per click).
  //    Held stable across retries so a retry settles the SAME logical operation.
  // 2. Before submit, ensure a valid step-up MFA token exists; if not, drive the
  //    inline MFA challenge and obtain X-MFA-Token before sending.
  // 3. Disable the submit control while in-flight; never allow double submit.
  // 4. On success, invalidate the listed query keys.
  // 5. On 409 duplicate (idempotency replay), treat as success — the operation
  //    already happened; surface the original result.
}
```

### 6.1 Idempotency Key Lifecycle (client-side)

The idempotency key is generated **when the user opens the mutation form**, not when they click submit. If they click submit, the network flakes, and they click again, the *same* key goes to the server, which returns the cached first result rather than charging twice. The key is regenerated only when the form is reset for a genuinely new operation.

### 6.2 Inline Step-Up MFA Flow

For a refund approval, census lock, result publish, etc., the mutation wrapper checks for a valid step-up token. If absent or expired (>5 min old), it opens a modal MFA challenge, the user enters their TOTP code, the client calls `POST /auth/stepup`, receives the scoped proof token, and only then sends the original mutation with `X-MFA-Token`. The user experiences one seamless flow; the architecture keeps the high-risk action gated.

---

## 7. Web Application Architecture (`apps/web`)

### 7.1 Next.js 15 App Router — Role-Partitioned Route Groups

The web app uses route groups to partition the 16 roles into separate layout trees. Each group has its own layout, navigation, and — critically — its own bundle split.

```
apps/web/src/app/
├── (auth)/                    -- unauthenticated: login, MFA setup, password reset
│   ├── login/
│   ├── mfa-setup/
│   └── reset-password/
│
├── (platform)/                -- platform_owner, platform_admin, dpo
│   ├── layout.tsx             -- platform console shell + nav
│   ├── tenants/
│   ├── revenue/               -- ledger, PSF dashboards
│   ├── ivp/                   -- anomaly cases
│   ├── referrals/
│   └── compliance/            -- DSAR, breach (dpo)
│
├── (regional)/                -- regional_manager, regional_subordinate
│   ├── layout.tsx
│   ├── dashboard/
│   ├── onboarding/
│   └── earnings/
│
├── (school)/                  -- school_owner, principal, admin_officer, accountant,
│   │                             cashier, exam_officer, timetable_officer, teacher,
│   │                             class_teacher
│   ├── layout.tsx             -- school shell; sidebar adapts to role
│   ├── dashboard/
│   ├── students/
│   ├── academic/
│   ├── finance/
│   ├── staff/                 -- HRM
│   ├── sessions/              -- academic year/term, census lock
│   └── settings/
│
├── (parent)/                  -- parent (web is secondary; mobile primary)
│   ├── layout.tsx
│   └── children/
│
├── api/                       -- Next.js route handlers (BFF — see §7.3)
│   └── auth/                  -- httpOnly cookie session proxy
│
├── layout.tsx                 -- root layout: providers, fonts, error boundary
└── middleware.ts              -- edge auth gate + role-based route protection
```

### 7.2 Middleware — Edge Auth Gate

`middleware.ts` runs at the edge before any page renders. It:

1. Reads the session cookie (httpOnly).
2. If absent on a protected route → redirect to `/login`.
3. Decodes the JWT role claim and checks it against the requested route group. A `teacher` hitting `/(platform)/revenue` is redirected to their own dashboard. This is UX-level protection (defence in depth); the real enforcement is server-side, but we never render a console the user has no business seeing.

### 7.3 BFF Pattern for Token Storage (security)

Web does NOT store JWTs in `localStorage` (XSS-vulnerable). Instead, a thin Backend-for-Frontend layer using Next.js route handlers stores the refresh token in an **httpOnly, Secure, SameSite=Strict cookie**. The access token is held in memory (React context) and refreshed via a `/api/auth/refresh` route handler that reads the httpOnly cookie. This means an XSS payload cannot exfiltrate the refresh token.

```
Browser  ──login──►  /api/auth/login (route handler)
                          │ calls Fastify backend, receives tokens
                          │ sets refresh token as httpOnly cookie
                          ▼
                     returns access token in body (held in memory only)
```

### 7.4 Server Components vs Client Components

- **Server Components (default):** static shells, layouts, navigation chrome, anything that doesn't need interactivity. Reduces client bundle.
- **Client Components (`'use client'`):** anything with TanStack Query, forms, Zustand, or event handlers. Data-heavy authenticated pages are client components because the auth token lives client-side and data is user-specific (not cacheable at the server).

Decision rule: if a page needs the user's session token to fetch data, it's a client component fetching via the shared api-client. Server Components are reserved for the non-authenticated marketing shell and static layout structure.

### 7.5 Web Design System (`packages/ui-web`)

- **Base:** Shadcn/UI (Radix primitives + Tailwind) — accessible, unstyled-then-themed, copy-in components we own.
- **Styling:** Tailwind CSS with tokens from `packages/design-tokens`.
- **Data tables:** TanStack Table v8 (the student lists, payment lists, ledger views are all heavy tables with sorting, filtering, cursor pagination).
- **Charts:** Recharts for dashboards (revenue, IVP anomaly trends, attendance rates).
- **Forms:** React Hook Form + Zod resolver using the shared contract schemas.

---

## 8. Mobile Application Architecture (`apps/mobile`)

The mobile app is the primary interface for Parents, Students, Class Teachers, and Teachers, and it is **offline-first**.

### 8.1 Expo + Navigation Structure

```
apps/mobile/src/
├── app/                       -- Expo Router (file-based, mirrors role stacks)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── mfa.tsx
│   ├── (parent)/              -- multi-child dashboard, fees, results, messages
│   ├── (student)/             -- results, timetable, assignments, attendance
│   ├── (teacher)/             -- gradebook (own subjects), assignments, materials
│   ├── (class-teacher)/       -- attendance marking (offline), class overview, parent msg
│   └── _layout.tsx            -- root: providers, auth gate, offline banner
│
├── features/                  -- feature modules (mirror domains)
│   ├── attendance/            -- offline-first; the flagship offline feature
│   ├── gradebook/             -- offline drafts
│   ├── payments/
│   └── ...
│
├── offline/
│   ├── db.ts                  -- SQLite (expo-sqlite) schema + migrations
│   ├── queue.ts               -- mutation queue: enqueue, sign, sync, resolve conflicts
│   ├── sync-engine.ts         -- background sync orchestrator
│   └── crypto.ts              -- per-tenant ECDSA device key signing
│
├── lib/
│   ├── secure-store.ts        -- token + device key storage (Expo SecureStore / Keychain)
│   └── biometrics.ts          -- Face ID / fingerprint (expo-local-authentication)
└── ...
```

### 8.2 Offline-First Architecture (the defining mobile decision)

The app must let a Class Teacher mark attendance with no connectivity and sync later (SRS FR-ACA-005, SEC-DAT-006/009). The model:

```
 ┌──────────────────────────────────────────────────────────┐
 │  USER ACTION (mark attendance)                            │
 └───────────────────────────┬──────────────────────────────┘
                             ▼
 ┌──────────────────────────────────────────────────────────┐
 │  WRITE TO LOCAL SQLite IMMEDIATELY (encrypted at rest)    │
 │  - Record stored with status = 'pending_sync'             │
 │  - Signed with per-tenant ECDSA device key                │
 │  - UI reads from SQLite → instant, works offline          │
 └───────────────────────────┬──────────────────────────────┘
                             ▼
 ┌──────────────────────────────────────────────────────────┐
 │  SYNC ENGINE (on connectivity / on app foreground)        │
 │  - Dequeue pending records in order                       │
 │  - POST to server with signature + tenant id + device id  │
 │  - Server verifies signature, applies, returns result     │
 └───────────────────────────┬──────────────────────────────┘
                             ▼
 ┌──────────────────────────────────────────────────────────┐
 │  RECONCILE                                                │
 │  - Success → mark local record 'synced'                   │
 │  - Conflict → apply server's conflict rule, surface to UI │
 │  - Rejected (bad signature/tenant) → quarantine + alert   │
 └──────────────────────────────────────────────────────────┘
```

### 8.3 Local Encryption

The SQLite database is encrypted at rest. The encryption key is derived from a key held in Expo SecureStore (which uses the iOS Keychain / Android Keystore). On the device, attendance and gradebook drafts are never written in plaintext (SEC-DAT-006).

### 8.4 Per-Tenant Device Key Signing

On first authenticated sync with a tenant, the app generates an ECDSA P-256 keypair. The private key never leaves SecureStore. Every queued offline action is signed over `(payload + tenantId + deviceId + timestamp)`. The server verifies the signature before accepting the sync (SEC-DAT-009). A record whose declared tenant doesn't match the authenticated context is rejected wholesale — never partially applied.

### 8.5 Conflict Resolution (client side of the protocol)

The sync engine implements the client half of the protocol defined in System Design §11.1:

- If server reports the day's attendance was already submitted from another session → the engine discards the local queued entries and refreshes from server, showing the user the authoritative records.
- If partial per-student disagreement → later timestamp wins per student; the engine records the resolution locally and logs it.
- Entries unsynced for >7 days prompt the user on app open to review/resolve before auto-discard (ASM-010).

### 8.6 Offline Queue Durability

The queue lives in SQLite, not memory — it survives app kills, crashes, and OS-initiated termination. A Zustand store mirrors the queue's *summary* (count of pending items, last sync time) for the UI's offline banner, but the durable truth is SQLite.

### 8.7 Mobile Design System (`packages/ui-mobile`)

- **Styling:** NativeWind (Tailwind for React Native) using the same `design-tokens` as web, so brand colors and spacing match across platforms.
- **Navigation:** Expo Router (file-based, type-safe routes).
- **Push:** `expo-notifications` bridging FCM/APNs. Notification bodies never contain PII or grades (System Design §11.2) — only opaque deep-link IDs.
- **Biometrics:** `expo-local-authentication` for Face ID / fingerprint as a secondary login after the initial password+MFA (SEC-AUTH-004). Biometrics never bypass step-up MFA for high-risk actions.

---

## 9. Role-Based Rendering — Capability Map

The frontend never hardcodes `if (role === 'principal')` scattered across components. Instead, `packages/core` exports a **capability map** derived from the SRS Role-Permission Matrix, and components check capabilities.

```typescript
// packages/core/src/capabilities.ts
export type Capability =
  | 'attendance.mark'
  | 'gradebook.write'
  | 'payment.verify'
  | 'census.lock'
  | 'staff.onboard'
  | 'refund.approve'
  // ... mirrors the SRS Role-Permission Matrix exactly

export const roleCapabilities: Record<Role, Set<Capability>> = {
  class_teacher: new Set(['attendance.mark', 'gradebook.read', 'parent.message']),
  teacher: new Set(['gradebook.write']),
  accountant: new Set(['payment.verify', 'fee.configure']),
  // ...
};

export function can(role: Role, capability: Capability): boolean {
  return roleCapabilities[role]?.has(capability) ?? false;
}
```

Usage in a component:

```tsx
{can(user.role, 'attendance.mark') && <MarkAttendanceButton />}
```

This keeps client-side rendering consistent with the server's authorisation model — both derive from the same matrix. **Reminder: this is UX, not security.** The server independently enforces every capability. Hiding the button just prevents users seeing actions that would 403 anyway.

---

## 10. Forms and Validation

Every form uses **React Hook Form + Zod resolver with the shared contract schema**:

```tsx
const form = useForm<LogOfflinePaymentRequest>({
  resolver: zodResolver(logOfflinePaymentRequest),  // SAME schema the server uses
});
```

This means client-side validation is byte-for-byte identical to server validation. A field the server would reject is rejected in the browser first, with no round trip. When the server adds a new constraint to the schema, the form picks it up automatically through the shared package.

Money inputs are always entered in Naira in the UI and converted to kobo (×100) in the form's transform layer before hitting the contract schema (which expects `amountMinor`). The display layer converts back. Users never see kobo; the wire never sees Naira floats.

---

## 11. Error Handling

### 11.1 Typed Errors End to End

The api-client maps every error response to a `LoomisError` carrying the namespaced `code`. Components and hooks switch on `code`, never on HTTP status or message strings.

### 11.2 Error Boundary Hierarchy

```
Root Error Boundary (catches catastrophic render errors → friendly full-page fallback)
  └── Route Group Boundary (per layout — keeps nav working, shows in-content error)
        └── Feature Boundary (around data-heavy widgets — one failing widget
                              doesn't blank the whole page)
```

### 11.3 Global Handlers

- `401 IDENTITY_SESSION_INVALIDATED` from any query/mutation → global handler triggers hard logout (preserving the mobile offline queue) and routes to login.
- `403` → in-content "you don't have access" state (should be rare because UI hides unauthorised actions).
- `429` → respect `Retry-After`; show a gentle "slow down" toast; the api-client auto-retries idempotent GETs with backoff.
- `503` on a financial write (fail-closed) → explicit "the system is protecting your transaction; please retry" message; the idempotency key makes the retry safe.

---

## 12. Performance

### 12.1 Web

- **Bundle splitting by route group:** a Teacher never downloads the platform console code. Next.js automatically code-splits per route; the role partitioning maximises this.
- **TanStack Query caching** eliminates redundant fetches; `staleTime` tuned per data volatility (§5.3).
- **Server Components** for static shell reduce client JS.
- **Targets (from NFR-PERF):** dashboard load < 2s p95; data queries < 500ms. The client contributes by parallelising independent queries and showing skeleton states immediately.
- **Virtualised tables** (TanStack Virtual) for large student/payment lists — render only visible rows.

### 12.2 Mobile

- **Cold start < 3s (NFR-PERF-004):** minimise the JS bundle, lazy-load non-initial route stacks, use Hermes engine (Expo default).
- **Offline reads are instant** because they hit local SQLite, not the network.
- **Attendance/gradebook in ≤3 taps** from home (NFR usability) — navigation designed around this.
- **Image handling:** `expo-image` with caching for student photos and receipt thumbnails.

---

## 13. Accessibility

- Web: Shadcn/Radix primitives are accessible by default (ARIA, keyboard nav, focus management). All interactive elements keyboard-reachable; forms have associated labels; color contrast meets WCAG AA using the design tokens.
- Mobile: every touchable has an `accessibilityLabel` and `accessibilityRole`; respects OS font scaling; minimum 44×44pt touch targets.
- Both: never rely on color alone to convey status (e.g., payment verified shows an icon + label, not just green).

---

## 14. Internationalisation Readiness

Launch is English (Nigeria), but the architecture is i18n-ready: all user-facing strings live in message catalogs (`next-intl` on web, `i18next` on mobile sharing the same message JSON in `packages/core/i18n`). No hardcoded strings in components. Currency is always NGN with the `₦` symbol and proper thousands grouping via `Intl.NumberFormat`. Dates render in the school's locale and timezone (Africa/Lagos), formatted from UTC ISO strings returned by the API.

---

## 15. Testing Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit (logic) | Vitest | `packages/core` capability maps, money/date helpers, conflict-resolution logic |
| Contract | Vitest | Zod schemas accept valid / reject invalid payloads (shared with backend tests) |
| Component (web) | Vitest + Testing Library | Forms validate, role gating renders correctly, error states |
| Component (mobile) | Jest + RN Testing Library | Offline queue UI, attendance marking flow |
| Hooks | Testing Library + MSW | TanStack Query hooks with mocked API (Mock Service Worker) |
| E2E (web) | Playwright | Critical journeys: login+MFA, census lock, log+verify payment, refund approval |
| E2E (mobile) | Maestro | Login, mark attendance offline → reconnect → sync, view results |
| Offline sync | Vitest (sync-engine) | Conflict resolution rules, signature signing, quarantine on tenant mismatch |

The offline sync engine gets the most rigorous testing because it is the highest-risk, hardest-to-debug part of the system. Every conflict branch from §8.5 has a dedicated test.

---

## 16. Build and Release

### 16.1 Web

- Built and deployed as a container (Next.js standalone output) to ECS Fargate behind the same ALB/CloudFront as the API (System Design §12).
- CI: `turbo run typecheck lint test build` — a contract change that breaks web fails CI before merge.
- Preview deployments per PR for visual review.

### 16.2 Mobile

- **EAS Build** (Expo Application Services) produces iOS and Android binaries.
- **EAS Update** (OTA) ships JS-only changes without an app store review — used for non-native fixes.
- Native changes (new permissions, native modules) require a full store submission.
- **Certificate pinning** (System Design §11.3) is configured in the native build; pin rotation follows the 30-day overlap procedure.
- Versioning: the app sends its version in a header; the API can require a minimum version and prompt force-update for breaking API changes.

### 16.3 Shared CI Gates

```
PR opened
  └─ turbo run typecheck   (all packages — catches contract breakage)
  └─ turbo run lint        (incl. dependency-direction rule §1.2)
  └─ turbo run test        (unit + component + contract + sync-engine)
  └─ web: playwright smoke
  └─ mobile: maestro smoke (on EAS)
       └─ all green → merge allowed
```

---

## 17. Mapping Screens to User Stories (Phase 1 Focus)

Per the current build phase (Identity → Tenant → HRM → Academic Session → Student), the Phase 1 frontend surface:

| Story | Web Screen | Mobile Screen |
|-------|-----------|---------------|
| US-XC-001 Login + MFA | `(auth)/login`, `(auth)/mfa-setup` | `(auth)/login`, `(auth)/mfa` |
| US-XC-003 Password reset | `(auth)/reset-password` | `(auth)` reset flow |
| US-HRM-008 Manage sessions/devices | `(school)/settings/security` | Settings → Security |
| US-PLT-001 Provision tenant | `(platform)/tenants/new` | — (platform is web-only) |
| US-HRM-001 Staff onboarding | `(school)/staff/invite` | — |
| US-HRM-002/003/004 Assignments | `(school)/staff/[id]/assignments` | — |
| US-ASM-001/002 Year & term setup | `(school)/sessions` | — |
| US-ASM-003 Census lock | `(school)/sessions/census-lock` (step-up MFA) | — |
| US-SIS-001/002 Admissions | `(school)/students/admissions` | — |
| US-SIS-003 Enrollment | `(school)/students/[id]/enroll` | — |
| US-SIS-004/005 Parent link | `(school)/students/[id]/link-parent` | `(parent)` accept-link flow |

Platform and school-admin functions are web-first (complex tables, multi-step forms). Parent, Student, Teacher, and Class Teacher functions are mobile-first. This matches the SRS operating-environment guidance and concentrates Phase 1 web effort on the school-staff console.

---

## Appendix A: Frontend Technology Stack Summary

| Concern | Web | Mobile | Shared |
|---------|-----|--------|--------|
| Framework | Next.js 15 (App Router) | Expo (React Native) | — |
| Language | TypeScript | TypeScript | TypeScript |
| Routing | App Router route groups | Expo Router | — |
| Server state | TanStack Query v5 | TanStack Query v5 | `packages/api-client` |
| Client state | Zustand | Zustand | — |
| Forms | React Hook Form + Zod | React Hook Form + Zod | `packages/contracts` |
| Styling | Tailwind + Shadcn/UI | NativeWind | `packages/design-tokens` |
| Tables | TanStack Table | FlashList | — |
| Charts | Recharts | Victory Native | — |
| Auth storage | httpOnly cookie (BFF) | Expo SecureStore | `packages/api-client` adapter |
| Offline store | — | expo-sqlite (encrypted) | — |
| Biometrics | — | expo-local-authentication | — |
| Push | Web Push (optional) | expo-notifications (FCM/APNs) | — |
| i18n | next-intl | i18next | `packages/core/i18n` |
| Testing | Vitest + Playwright | Jest + Maestro | Vitest (logic/contracts) |
| Build | Container → ECS | EAS Build + EAS Update | Turborepo |

---

## Appendix B: Critical Frontend Rules (candidate for a new Cursor rule)

1. Never store JWTs in `localStorage` on web — httpOnly cookie via BFF only.
2. Never put server data in Zustand — TanStack Query owns server state.
3. Every tenant-scoped query key includes `tenantId` as the second element.
4. Financial mutations use `useFinancialMutation` (idempotency key + step-up MFA) — never a raw mutation.
5. The idempotency key is generated on form mount, held stable across retries.
6. All forms validate with the shared Zod contract schema — no bespoke client validation.
7. Money is entered/displayed in Naira; transmitted/stored as kobo (`amountMinor`).
8. Switch on `error.code`, never on HTTP status or message strings.
9. `IDENTITY_SESSION_INVALIDATED` → hard logout (preserve mobile offline queue); never refresh.
10. On logout, call `queryClient.clear()` — purge all cached tenant data.
11. Mobile: write to local SQLite first, sync later — UI reads from local store.
12. Mobile offline entries are signed with the per-tenant device key before sync.
13. Role gating in UI uses the `can(role, capability)` map — never inline role string checks.
14. Notification bodies never contain PII, grades, or amounts — opaque deep-link IDs only.

---

*Loomis Frontend Architecture v1 — authoritative specification for the web and mobile applications. Aligned to System Design v1, SRS v3, and the Cursor Rules. Deviations require an Architecture Decision Record.*
