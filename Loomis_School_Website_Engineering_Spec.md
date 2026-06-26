# Loomis Platform — School Website Builder Engineering Specification

**Classification:** Production-Grade Engineering Specification  
**Date:** 26 June 2026  
**Status:** Approved for implementation  
**Authored by:** Engineering Team  
**Basis:** Loomis SRS v3 · System Design v1 · Frontend Architecture v1 · User Stories v1 · Revenue Integrity Architecture FINAL

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 26/06/2026 | Engineering Team | Initial full engineering spec for per-tenant public school websites with template-driven section editor |

---

## Document Conventions

- Monetary amounts: `BIGINT` kobo (minor NGN units) where applicable.
- Identifiers: UUIDv7 unless stated otherwise.
- Times: UTC ISO-8601.
- **MVP constraint:** template-driven **section editor** (reorder, toggle, edit fields) — **not** a freeform canvas/page builder. This keeps v1 shippable while feeling like drag-and-drop to school admins.
- Public website routes are **unauthenticated**. Admin editor routes follow existing school console patterns.

---

## 1. Executive Summary

### 1.1 Product Vision

Every school on Loomis receives a **free, professional public website** included with their subscription. School admins choose a template, edit predefined sections (hero, about, admissions, gallery, contact), preview, and publish — no developer required.

The website is the school's **public front door** and a growth lever for Loomis: it improves onboarding perception, drives admissions inquiries into Loomis, and creates natural upsell paths (custom domain, SEO, analytics, advanced templates).

### 1.2 Strategic Positioning

| Dimension | Decision |
|-----------|----------|
| Builder paradigm | Section-based editor (Notion/Webflow-lite), not pixel canvas |
| Hosting | Loomis-hosted on `www.loomis.digital/s/{slug}` (MVP); `{slug}.loomis.digital` in Phase 2; custom domain in Phase 3 |
| Data model | Draft + published snapshots (immutable publish records) |
| Integration depth | Phase 1: static content; Phase 2: admissions + contact → Loomis modules |
| Tier | Included in all tiers at MVP; premium features gated later |

### 1.3 Relationship to Existing Platform

Loomis already has foundational pieces this feature extends:

| Existing asset | Location | Website use |
|----------------|----------|-------------|
| School name, address, contact | `tenant.tenants` | Auto-populate contact/footer |
| School logo upload | `tenant.configurations` key `school.branding` + Storage `public_tenant` | Hero, header, OG image |
| Storage module (S3 presign) | `apps/api/src/modules/storage` | Gallery images, principal photo |
| Settings shell | `/school/settings/*` | Admin editor nav sibling or dedicated `/school/website` |
| Admissions module | `student` module | Phase 2: public inquiry → admission record |
| Comms module | `comms` module | Phase 2: contact form → school inbox + email |

**New module:** `website` — owns public site config, publish snapshots, slug resolution, public inquiry endpoints, and analytics events.

---

## 2. User Stories (Epic US-WEB)

Add to `Loomis_User_Stories_v1.md` as **Epic US-WEB — School Public Website**.

### US-WEB-001: Provision Default Website on Tenant Activation
*As a Platform Administrator, I want every newly activated school to receive a default unpublished website seeded from their tenant profile, so that the school owner can publish quickly without starting from scratch.*

On tenant activation, the system creates a `website_sites` row with a unique draft slug suggestion, selects the default template (`prestige`), seeds sections from tenant name/address/contact, and sets status `draft`. Before publish, the school chooses its own short one-word address in the website setup page (for example `grace`, producing `grace.loomis.digital`). The School Owner receives an onboarding prompt linking to the website editor.

### US-WEB-002: Choose and Preview a Website Template
*As a School Owner or Principal, I want to pick from professional templates and preview how my site will look, so that I can launch a credible public presence without design skills.*

The editor shows 3+ templates with live preview (desktop + mobile). Switching template preserves section content where field keys overlap. Preview uses draft content; visitors never see draft until publish.

### US-WEB-003: Edit Website Sections
*As a School Owner, Principal, or Admin Officer, I want to edit hero text, about copy, gallery images, and contact details through a simple section editor, so that I can keep our public site accurate without a developer.*

Sections can be toggled on/off, reordered via drag handles, and edited through form fields validated by shared Zod schemas. Image uploads use the existing Storage module (`public_tenant` classification, `owner_resource_type = website_asset`).

### US-WEB-004: Publish and Unpublish the School Website
*As a School Owner or Principal, I want to publish or unpublish our public website, so that I control when parents and prospects can see it.*

Publish creates an immutable snapshot (version number incremented). Unpublish sets site status to `unpublished` — public URL returns 404 with branded "site not available" page. Only `school_owner` and `principal` may publish/unpublish. `admin_officer` may edit draft only.

### US-WEB-005: View the Public School Website
*As a prospective parent or community member, I want to visit the school's public website on a memorable URL, so that I can learn about the school and take next steps (contact, admissions).*

Public URL resolves without authentication. Suspended tenants: website returns 403 with generic message (no internal details). Page is mobile-responsive, fast (LCP < 2.5s on 4G target), and accessible (WCAG 2.1 AA for public pages).

### US-WEB-006: Submit a Contact Inquiry from the Website
*As a prospective parent, I want to send a message from the school's contact form, so that the school can respond to my enquiry.*

Phase 2. Form submission is rate-limited (IP + tenant), CAPTCHA-protected, and creates a `website_inquiries` record. School receives notification via Comms (email to primary contact). No PII in application logs.

### US-WEB-007: Submit an Admissions Interest from the Website
*As a prospective parent, I want to express interest in admission from the website, so that the school can follow up through their normal admissions process.*

Phase 2. Creates a draft `admissions` record (or `admission_inquiry` subtype) in the Student module with source `website`. Admin Officer sees it in admissions pipeline with `source=website` badge.

### US-WEB-008: Display Live School Announcements on the Website
*As a School Owner, I want selected announcements from Loomis to appear on our public news section, so that the website stays current without duplicate data entry.*

Phase 3. Opt-in per announcement (`publish_to_website` flag on comms broadcast or dedicated website news posts).

### US-WEB-009: Connect a Custom Domain
*As a School Owner, I want our website on our own domain (e.g. `www.graceacademy.com.ng`), so that the school looks fully independent.*

Phase 3 (paid). DNS verification via TXT record; TLS via ACM; CloudFront alternate domain. Falls back to Loomis subdomain until verified.

### US-WEB-010: View Website Analytics
*As a School Owner or Principal, I want basic traffic stats (visits, top pages, inquiry count), so that I can measure admissions funnel effectiveness.*

Phase 3. Privacy-preserving aggregates only; no third-party tracker required for MVP analytics (server-side page view events).

---

## 3. Role × Capability Matrix

### 3.1 New Capabilities (`packages/core/src/capabilities.ts`)

```typescript
| Capability            | Description                                      |
|-----------------------|--------------------------------------------------|
| website.view          | See website editor, draft, preview               |
| website.edit          | Edit sections, upload media, change template     |
| website.publish       | Publish / unpublish public site                  |
| website.inquiries.view| View contact/admission inquiries from website    |
| website.analytics.view| View traffic summary (Phase 3)                   |
```

### 3.2 Role Assignments

| Role | Capabilities | Notes |
|------|--------------|-------|
| `school_owner` | view, edit, publish, inquiries.view, analytics.view | Full control |
| `principal` | view, edit, publish, inquiries.view, analytics.view | Full control |
| `admin_officer` | view, edit, inquiries.view | Cannot publish |
| All other school roles | — | No editor access; no nav link |
| Platform roles | view (break-glass only) | Read-only support via break-glass |

Enforce on **API** (`requireRole`) and **UI** (`useCan` / `useCanAny`). Never inline `if (role === 'principal')`.

---

## 4. Architecture Decision

### 4.1 Decision: Dedicated `website` Module in Modular Monolith

The website feature gets its own DB schema (`website`), service layer, and API routes. It reads from `tenant` and `storage` via service boundaries — never cross-schema JOINs at the handler level.

**Rationale:**
- Public read path has different scaling, caching, and security profile than authenticated school APIs.
- Publish snapshots are immutable content versions — distinct lifecycle from `tenant.configurations`.
- Future extraction to edge-rendered static site generator is possible without refactoring tenant module.

### 4.2 Public URL Strategy

**Phase 1 (implemented):** per-school subdomain on the Next.js web app

```
https://{slug}.loomis.digital
```

Example: `https://grace-academy-lagos.loomis.digital`

The edge middleware resolves the `Host` header to a slug
(`extractSchoolSlugFromHost`) and rewrites to the `/s/[slug]` renderer.
Reserved labels (`www`, `api`, `app`, …) are never treated as schools.

**Path fallback (no wildcard DNS):** set `PUBLIC_SITE_URL_MODE=path`

```
https://www.loomis.digital/s/{slug}
```

**Phase 3:** custom domain

```
https://www.graceacademy.com.ng  →  CNAME  →  CloudFront distribution
```

### 4.3 Rendering Strategy

| Layer | Approach |
|-------|----------|
| Public pages | Next.js App Router route group `(public-site)` — Server Components fetch published snapshot via internal API or direct BFF |
| Admin editor | Client Components in `(school)` group — TanStack Query hooks |
| Caching | `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on published snapshot GET; purge on publish |
| CDN | CloudFront in front of public site paths; gallery images already on S3 + CloudFront |

### 4.4 Draft vs Published Model

```
┌─────────────────┐     publish      ┌──────────────────────┐
│  website_sites  │ ───────────────► │ website_publish_      │
│  (draft JSON)   │                  │ snapshots (immutable) │
└─────────────────┘                  └──────────────────────┘
        │                                        │
        │ edit                                   │ public read
        ▼                                        ▼
   Admin editor                           GET /public/sites/:slug
```

- **Draft** lives on `website_sites` — mutable, tenant-scoped, RLS protected.
- **Published** snapshot is append-only — each publish inserts a new row; `website_sites.published_snapshot_id` points to current live version.
- Rollback = publish pointer moved to prior snapshot (new publish event, no mutation of old snapshots).

---

## 5. Database Schema

New schema: `website` (Drizzle file: `apps/api/drizzle/schema/website.ts`).

### 5.1 `website_sites`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | uuidv7 |
| `tenant_id` | UUID FK → tenant.tenants | UNIQUE — one site per school |
| `slug` | varchar(80) UNIQUE | URL-safe; immutable after first publish |
| `status` | varchar(20) | `draft` \| `published` \| `unpublished` |
| `template_id` | varchar(50) | e.g. `prestige`, `bright_start`, `academic_trust` |
| `theme` | jsonb | `{ primaryColor, accentColor, fontPair }` |
| `sections` | jsonb | Ordered array of section instances (draft) |
| `seo` | jsonb | `{ title, description, ogImageStorageObjectId }` |
| `published_snapshot_id` | UUID nullable | FK → website_publish_snapshots |
| `published_at` | timestamptz nullable | |
| `published_by_id` | UUID nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Constraints:**
- `slug` matches `^[a-z0-9]+(?:-[a-z0-9]+)*$` (lowercase, hyphenated).
- `status` check constraint.
- RLS: `tenant_id = current_setting('app.current_tenant_id')` for tenant-bound ops; platform reads use null tenant context.

### 5.2 `website_publish_snapshots`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK | |
| `tenant_id` | UUID | Denormalized for RLS |
| `version` | int | Monotonic per site |
| `template_id` | varchar(50) | |
| `theme` | jsonb | Frozen at publish |
| `sections` | jsonb | Frozen at publish |
| `seo` | jsonb | |
| `published_by_id` | UUID | |
| `created_at` | timestamptz | |

**Immutability:** INSERT only; DB trigger blocks UPDATE/DELETE (same pattern as PSF snapshots).

### 5.3 `website_inquiries` (Phase 2)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID | |
| `site_id` | UUID | |
| `type` | varchar(20) | `contact` \| `admission_interest` |
| `submitter_name` | varchar(200) | |
| `submitter_email` | varchar(255) | |
| `submitter_phone` | varchar(20) nullable | |
| `message` | text | Max 2000 chars |
| `metadata` | jsonb | `{ childAge, classInterest, utmSource }` |
| `status` | varchar(20) | `new` \| `read` \| `archived` |
| `admission_id` | UUID nullable | FK if promoted to admission |
| `ip_hash` | varchar(64) | HMAC of IP for abuse detection; not raw IP |
| `created_at` | timestamptz | |

### 5.4 `website_page_views` (Phase 3, optional)

Aggregated daily counters per site/path — not raw hit logs (NDPA minimization).

### 5.5 Slug Selection

On site creation, Loomis creates a draft slug suggestion so the record has a valid URL handle, but the school-facing setup flow treats this as editable. The school chooses a simple one-word slug:

1. Only lowercase letters and numbers, 3–30 characters.
2. No spaces, dots, punctuation, or hyphens in user-chosen slugs.
3. Reserved labels (`www`, `api`, `app`, `admin`, etc.) are rejected.
4. The API checks global availability before saving.
5. Slug changes are audit-logged; published links immediately use the new subdomain.

---

## 6. Section & Template Contract

### 6.1 Section Type Registry

Defined in `packages/contracts/src/website/sections.ts` — single source of truth for API validation and editor forms.

```typescript
type SectionType =
  | 'hero'
  | 'about'
  | 'principal_welcome'
  | 'mission_values'
  | 'why_choose_us'
  | 'academics'
  | 'admissions_cta'
  | 'fee_summary'
  | 'gallery'
  | 'testimonials'
  | 'faq'
  | 'contact'
  | 'whatsapp_cta'
  | 'parent_portal_cta'
  | 'announcements'; // Phase 3

interface WebsiteSection {
  id: string;           // uuid — stable across reorders
  type: SectionType;
  enabled: boolean;
  order: number;
  props: SectionProps;    // discriminated union per type
}
```

### 6.2 MVP Section Props (Phase 1)

| Section | Editable fields |
|---------|-----------------|
| `hero` | `headline`, `subheadline`, `ctaLabel`, `ctaHref`, `backgroundStorageObjectId` |
| `about` | `title`, `body` (rich text subset: p, strong, em, ul, li, a), `imageStorageObjectId` |
| `principal_welcome` | `principalName`, `title`, `message`, `photoStorageObjectId` |
| `admissions_cta` | `title`, `body`, `buttonLabel` |
| `gallery` | `images: { storageObjectId, caption }[]` (max 12) |
| `testimonials` | `items: { quote, author, role }[]` (max 6) |
| `faq` | `items: { question, answer }[]` (max 10) |
| `contact` | `showMap`, `showPhone`, `showEmail`, `formEnabled` (Phase 2) |
| `whatsapp_cta` | `phoneE164`, `prefillMessage` |
| `parent_portal_cta` | `title`, `body` (links to `/login`) |

Rich text: store as **Markdown subset** or **ProseMirror JSON** — pick one in implementation; Markdown recommended for simplicity and XSS sanitization via `rehype-sanitize`.

### 6.3 Templates (Phase 1)

| Template ID | Audience | Layout character |
|-------------|----------|------------------|
| `prestige` | Premium private secondary | Gold/cream hero, serif headings, testimonial emphasis |
| `bright_start` | Nursery/primary | Rounded cards, playful colors, large imagery |
| `academic_trust` | Formal college | Blue/white, academics + admissions focus |

Each template = React component layout mapping `sections[]` → rendered blocks. Templates share section components; differ in typography, spacing, and decorative chrome.

**Package location:** `packages/website-templates/` (shared between public renderer and editor preview) OR `apps/web/src/components/website/templates/` for v1 speed — migrate to package when mobile needs preview.

### 6.4 Default Seed on Provision

When `website_sites` is created:

```json
{
  "template_id": "prestige",
  "sections": [
    { "type": "hero", "enabled": true, "props": { "headline": "<tenant.name>" } },
    { "type": "about", "enabled": true, "props": { "title": "About Us", "body": "" } },
    { "type": "admissions_cta", "enabled": true },
    { "type": "contact", "enabled": true, "props": { "showEmail": true, "showPhone": true } }
  ]
}
```

Pull `contactEmail`, `contactPhone`, `address` from `tenant.tenants` into contact section defaults.

---

## 7. API Design

Base path: authenticated routes under `/tenants/:tenantId/website/*`.  
Public routes under `/public/sites/*` — **no JWT**; tenant resolved from slug.

### 7.1 Authenticated Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/tenants/:tenantId/website` | website.view | Get draft site + publish metadata |
| PUT | `/tenants/:tenantId/website` | website.edit | Update draft (template, theme, sections, seo) |
| POST | `/tenants/:tenantId/website/publish` | website.publish | Create snapshot, set status published |
| POST | `/tenants/:tenantId/website/unpublish` | website.publish | Set status unpublished |
| GET | `/tenants/:tenantId/website/preview` | website.view | Returns merged draft for iframe preview |
| GET | `/tenants/:tenantId/website/snapshots` | website.view | List publish history |
| POST | `/tenants/:tenantId/website/snapshots/:id/restore` | website.publish | Point published_snapshot_id to prior version |
| GET | `/tenants/:tenantId/website/inquiries` | website.inquiries.view | Phase 2 — paginated inquiries |
| PATCH | `/tenants/:tenantId/website/inquiries/:id` | website.inquiries.view | Mark read/archived |

**Publish/unpublish:** require `Idempotency-Key` header (workflow write pattern).

### 7.2 Public Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/sites/:slug` | None | Published site payload (snapshot JSON + resolved asset URLs) |
| POST | `/public/sites/:slug/inquiries` | None + CAPTCHA | Phase 2 — contact/admission interest |
| GET | `/public/sites/:slug/robots.txt` | None | Phase 3 SEO |
| GET | `/public/sites/:slug/sitemap.xml` | None | Phase 3 SEO |

**Public GET behaviour:**
- `404` if slug unknown, site `unpublished`, or tenant `suspended`.
- Response includes `resolvedAssets: Record<storageObjectId, cdnUrl>` — server resolves presigned/CDN URLs server-side; never expose internal S3 keys.
- Rate limit: 120 req/min/IP (WAF + API gateway).

### 7.3 Storage Integration

New `owner_resource_type` values:
- `website_asset` — gallery, hero backgrounds, principal photos
- `website_og_image` — SEO OG image

Classification: `public_tenant` (same as logo). Malware scan hook applies before `available` status.

Extend `schoolBrandingConfig` OR keep logo in branding config and reference `logoStorageObjectId` in website header — **recommended:** website header reads branding config at render time so logo stays single source of truth.

### 7.4 Event Outbox (Phase 2+)

| Event | Consumer |
|-------|----------|
| `website.published` | CDN cache purge, search index (future) |
| `website.inquiry.created` | Comms notification email |
| `website.inquiry.admission_interest` | Student module creates admission draft |

---

## 8. Frontend Architecture

### 8.1 Route Map

| Surface | Route | Group | Page type |
|---------|-------|-------|-----------|
| Public site | `/s/[slug]` | `(public-site)` | Server Component — SEO metadata from snapshot |
| Website hub | `/school/website` | `(school)` | Operational hub — KPI strip, publish status |
| Section editor | `/school/website/edit` | `(school)` | Split pane: section list + live preview |
| Template picker | `/school/website/templates` | `(school)` | Template gallery |
| Inquiries inbox | `/school/website/inquiries` | `(school)` | Directory — Phase 2 |
| Analytics | `/school/website/analytics` | `(school)` | Dashboard — Phase 3 |
| Settings nav link | Add "Website" to settings sub-nav OR top-level school nav | | |

**Middleware:** `/s/*` and `/public/*` are public (`groupForPath` returns null). No session cookie required.

### 8.2 Admin Editor UX

Follow **Step 4b quality bar** (loomis-ui-delivery):

1. **Hero strip** — site URL, publish status badge, last published date, Preview + Publish CTAs (`SEMANTIC.cta`).
2. **KPI cards** — publish status, section count, inquiries (Phase 2), template name.
3. **Editor layout** — left: draggable section list (dnd-kit); right: preview iframe or inline responsive preview.
4. **Section drawer** — clicking a section opens field editor (React Hook Form + zodResolver + contracts schema).
5. **Mobile** — section list stacks above preview; drag handles remain touch-friendly (44px targets).

### 8.3 Public Site UX

- Mobile-first responsive layouts per template.
- No authentication chrome.
- Footer: "Powered by Loomis" (removable in paid tier Phase 3).
- Core Web Vitals budget: LCP ≤ 2.5s, CLS ≤ 0.1.
- `next/image` for all gallery/hero images with blur placeholder.

### 8.4 TanStack Query Keys

```typescript
// packages/api-client/src/query/keys.ts
website: {
  site: (tenantId: string) => ['website', tenantId, 'site'] as const,
  inquiries: (tenantId: string, filters) => ['website', tenantId, 'inquiries', filters] as const,
},
publicSite: (slug: string) => ['public-site', slug] as const, // no tenantId — public
```

### 8.5 api-client Hooks

| Hook | Purpose |
|------|---------|
| `useWebsiteSite(tenantId)` | Draft site CRUD |
| `usePublishWebsite(tenantId)` | `useFinancialMutation` pattern if idempotency required |
| `useWebsiteInquiries(tenantId)` | Phase 2 |
| `usePublicSite(slug)` | Public page data (server-side fetch preferred) |

---

## 9. Security & Compliance

### 9.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| XSS via rich text | Sanitize on save (server) and render (client); allowlist tags only |
| Slug enumeration | Rate limit; no tenant metadata leak on 404 |
| Inquiry spam | CAPTCHA (hCaptcha/Turnstile), IP rate limit, honeypot field |
| Storage abuse | Max upload sizes per classification; owner_resource_type validation |
| Tenant suspension leak | Public API checks `tenant.status`; suspended → 403 generic |
| Draft content leak | Public API reads **only** `published_snapshot_id` payload |

### 9.2 NDPA

- Inquiry PII stored with retention schedule (align with `compliance` module — 24 months default, configurable).
- Public analytics: aggregated only; no fingerprinting.
- DSAR export includes `website_inquiries` for data subject requests.

### 9.3 Audit

Log events (no PII in log body):
- `website.published` — `{ tenantId, siteId, version, actorId }`
- `website.unpublished` — `{ tenantId, siteId, actorId }`
- `website.draft.updated` — `{ tenantId, siteId, actorId, sectionTypesChanged }`

---

## 10. Infrastructure

### 10.1 MVP (path-based)

- Next.js route `/s/[slug]` on existing `apps/web` deployment.
- BFF route `apps/web/src/app/api/public/sites/[slug]/route.ts` proxies to Fastify internal URL OR server component calls API with service token.

### 10.2 Subdomain (Phase 2)

- Route53 wildcard `*.loomis.ng` → CloudFront → ALB.
- Middleware resolves `Host` header → slug lookup.
- Cookie domain isolation: public site sets no auth cookies.

### 10.3 Custom Domain (Phase 3)

- `website_custom_domains` table: `{ domain, tenant_id, verification_status, acm_cert_arn }`.
- School adds CNAME; automated ACM + CloudFront alias provisioning (Terraform module).
- Auto HTTP→HTTPS redirect.

### 10.4 Cache Invalidation

On publish: purge CloudFront paths `/s/{slug}/*` via invalidation API (outbox consumer).

---

## 11. Monetization & Tier Gating

| Feature | Core (free) | Advanced | Enterprise |
|---------|-------------|----------|------------|
| Loomis subdomain/path | ✅ | ✅ | ✅ |
| 3 base templates | ✅ | ✅ | ✅ |
| Section editor | ✅ | ✅ | ✅ |
| "Powered by Loomis" footer | Shown | Removable | Removable |
| Custom domain | — | ✅ add-on | ✅ |
| Extra templates | — | ✅ | ✅ |
| Analytics dashboard | Basic counts | Full | Full + export |
| Blog/news sync | — | ✅ | ✅ |
| AI copy assist | — | — | ✅ Phase 4 |

Gate via `tenant.experience_flags` or new `website.plan` configuration key — do not hardcode tier checks in components; use capability + feature flag service.

---

## 12. Implementation Phases

### Phase 1 — MVP (4–6 sprints)

**Goal:** School can publish a beautiful static site at `/s/{slug}`.

| Sprint | Deliverables |
|--------|--------------|
| W1 | DB schema + migrations; `website` module skeleton; contracts schemas |
| W2 | CRUD API (draft); slug provisioning on tenant activation |
| W3 | 3 templates + public renderer `/s/[slug]`; SEO meta from snapshot |
| W4 | Admin editor `/school/website` — section list, edit, reorder |
| W5 | Publish/unpublish + snapshots; preview mode; capabilities + nav |
| W6 | QA, mobile polish, load test public endpoint, docs |

**Exit criteria:**
- School owner publishes site; anonymous user loads it on mobile + desktop.
- Suspended tenant site unavailable.
- Logo from existing branding appears in header.

### Phase 2 — Lead Capture (2–3 sprints)

- Contact + admission interest forms.
- `website_inquiries` + Comms email notification.
- Optional admission record creation in Student module.
- Inquiries inbox UI.

### Phase 3 — Growth (3–4 sprints)

- `{slug}.loomis.ng` subdomains.
- Custom domain verification + TLS.
- Analytics aggregates.
- Announcements section (Comms integration).
- Remove branding footer (paid).

### Phase 4 — AI Assist (future)

- Generate section copy from school profile.
- Tone rewrite, FAQ generation.
- Suggest theme colors from logo (dominant color extraction).

---

## 13. File & Module Layout

```
apps/api/src/modules/website/
├── index.ts
├── routes/
│   ├── website.routes.ts          # authenticated
│   └── public-website.routes.ts   # unauthenticated
├── handlers/
├── services/
│   ├── website.service.ts
│   ├── publish.service.ts
│   ├── slug.service.ts
│   └── public-resolver.service.ts
├── repository/
│   └── website.repository.ts
└── events/

apps/api/drizzle/schema/website.ts

packages/contracts/src/website/
├── site.schema.ts
├── sections.schema.ts
└── inquiries.schema.ts

packages/api-client/src/query/hooks/website.ts

apps/web/src/app/(public-site)/s/[slug]/page.tsx
apps/web/src/app/(school)/school/website/
├── page.tsx                       # hub
├── edit/page.tsx
└── templates/page.tsx

apps/web/src/components/website/
├── editor/
│   ├── website-hero.tsx
│   ├── section-list.tsx
│   └── section-editor-drawer.tsx
├── templates/
│   ├── prestige.tsx
│   ├── bright-start.tsx
│   └── academic-trust.tsx
└── sections/                      # shared section renderers
    ├── hero-section.tsx
    └── ...
```

---

## 14. Testing Strategy

### 14.1 API Tests (Vitest)

- Slug collision handling.
- Publish creates snapshot; public GET returns snapshot not draft.
- `admin_officer` can PUT draft but not POST publish → 403.
- Suspended tenant public GET → 403.
- XSS payload in `about.body` rejected or sanitized.

### 14.2 E2E (Playwright)

- Owner: edit hero → preview → publish → open `/s/{slug}` incognito → see hero text.
- Unpublish → incognito 404.
- Mobile viewport 375px — no horizontal scroll.

### 14.3 Load

- Public GET `/public/sites/:slug` — 500 RPS sustained with CDN cache hit ratio > 90%.

---

## 15. Open Questions (Resolve Before W1)

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Path `/s/{slug}` vs subdomain first? | Path first (less infra) |
| 2 | Markdown vs ProseMirror for rich text? | Markdown + sanitization |
| 3 | Dedicated `/school/website` vs `/school/settings/website`? | Top-level `/school/website` — it's a product surface, not a setting |
| 4 | Auto-publish on tenant activation? | No — default `draft`; prompt owner in onboarding checklist |
| 5 | Fee summary section — show amounts? | Phase 2; public summary only (no student-specific data) |

---

## 16. Success Metrics

| Metric | Target (90 days post-launch) |
|--------|------------------------------|
| % active schools with published site | ≥ 40% |
| Median time to first publish | < 30 minutes |
| Public site LCP (p75) | < 2.5s |
| Website-sourced inquiries / school / month | ≥ 2 (Phase 2) |
| Support tickets re: website setup | < 5% of onboardings |

---

## 17. Summary

The School Website Builder is a **new `website` module** with draft/publish snapshots, template-driven sections, and a public renderer at `/s/{slug}`. It extends existing branding and storage, gates admin actions through new capabilities, and phases in lead capture, subdomains, and monetization.

**Phase 1 is the commitment:** ship editor + 3 templates + publish — that alone is a compelling "free website included" story for sales.

---

*End of specification.*
