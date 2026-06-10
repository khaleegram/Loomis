# Loomis Platform — UI Design System Specification

**Purpose:** Complete design handoff for Figma designers. Every component, token, variant, layout, and state is documented so designers can build screens pixel-perfect without reading code.

**Classification:** Design System Spec (Figma Handoff)
**Date:** 09 June 2026
**Scope:** Entire SaaS platform — all 16 roles, all modules, all pages

---

## 1. DESIGN TOKENS

### 1.1 Brand Color Palette

```
Electric Blue (Primary)
  brand-50:   hsl(214 100% 97%) → preview bg, accent-bg
  brand-100:  hsl(214 95% 93%)  → soft backgrounds
  brand-200:  hsl(213 97% 87%)  → hover states
  brand-300:  hsl(212 96% 78%)
  brand-400:  hsl(213 94% 68%)
  brand-500:  hsl(217 91% 60%)  → brand accent, active links
  brand-600:  hsl(221 83% 53%)  → primary button, selected, focus ring
  brand-700:  hsl(224 76% 48%)  → heavy emphasis
  brand-800:  hsl(226 71% 40%)
  brand-900:  hsl(224 64% 33%)  → darkest brand
```

### 1.2 Accent Palette (Semantic Colors)

| Accent | Use Case | 50 | 500 | 600 |
|--------|----------|----|-----|-----|
| Green | Success, Settled, Approved, Operational | `hsl(138 76% 97%)` | `hsl(142 76% 36%)` | `hsl(142 72% 29%)` |
| Purple | Academic Insights, Gradebook, Exams | `hsl(270 100% 98%)` | `hsl(271 81% 56%)` | `hsl(271 70% 49%)` |
| Teal | Attendance, Student Engagement | `hsl(166 76% 97%)` | `hsl(173 80% 40%)` | `hsl(175 84% 32%)` |
| Orange | Finance, Fees, Revenue, Role Badges | `hsl(33 100% 96%)` | `hsl(25 95% 53%)` | `hsl(21 90% 48%)` |
| Pink | Communications, Announcements | `hsl(330 100% 98%)` | `hsl(330 81% 60%)` | — |

### 1.3 Gold (Legacy / Dashboard Accent)

```
gold-50:  hsl(33 100% 96%)
gold-100: hsl(34 100% 92%)
gold-200: hsl(32 98% 83%)
gold-300: hsl(31 97% 72%)
gold-400: hsl(27 96% 61%)   → light active indicator
gold-500: hsl(25 95% 53%)   → brand gold, chart highlight
gold-600: hsl(21 90% 48%)   → hover, icons
gold-700: hsl(17 88% 40%)
gold-800: hsl(15 79% 34%)
gold-900: hsl(15 75% 28%)
```

### 1.4 Neutral Gray Scale

```
neutral-50:  hsl(210 40% 98%)  → surface-bg
neutral-100: hsl(210 40% 96%)  → subtle-bg, muted
neutral-200: hsl(214 32% 91%)  → border, divider light
neutral-300: hsl(213 27% 84%)  → disabled border
neutral-400: hsl(215 16% 47%)  → muted-foreground, placeholder
neutral-500: hsl(215 19% 35%)
neutral-600: hsl(215 25% 27%)
neutral-700: hsl(217 33% 17%)  → dark border, dark secondary-bg
neutral-800: hsl(222 47% 11%)  → dark card-bg
neutral-900: hsl(224 71% 4%)   → foreground (darkest)
```

### 1.5 Dark Surface Palette (Forest)

```
forest-950: hsl(222 39% 9%)    → dark background
forest-900: hsl(222 39% 11%)   → dark card
forest-800: hsl(217 33% 17%)   → dark border, dark sidebar-bg
forest-700: hsl(215 25% 27%)
forest-600: hsl(215 19% 35%)
```

### 1.6 Semantic Status Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | `hsl(142 76% 36%)` | same | Positive trends, approved, settled |
| `--warning` | `hsl(38 92% 50%)` | same | Attention needed, pending |
| `--danger` / `--destructive` | `hsl(0 84% 60%)` | same | Outstanding, overdue, rejected |
| `--gold` | `hsl(25 95% 53%)` | `hsl(27 96% 61%)` | Premium accent, charts |
| `--canvas` | `hsl(220 20% 97%)` | — | Dashboard canvas background |

### 1.7 Semantic Token Map (Light Theme)

```
--background:       hsl(220 20% 97%)     canvas tint
--foreground:       hsl(224 71% 4%)      primary text
--card:             hsl(0 0% 100%)       white cards
--card-foreground:  hsl(224 71% 4%)
--popover:          hsl(0 0% 100%)
--popover-foreground: hsl(224 71% 4%)
--primary:          hsl(221 83% 53%)     brand-600
--primary-foreground: hsl(0 0% 100%)     white text on primary
--secondary:        hsl(210 40% 96%)     neutral-100
--secondary-foreground: hsl(224 71% 4%)
--muted:            hsl(210 40% 96%)     neutral-100
--muted-foreground: hsl(215 16% 47%)     neutral-400
--accent:           hsl(214 100% 97%)    brand-50
--accent-foreground: hsl(224 76% 48%)    brand-700
--destructive:      hsl(0 84% 60%)       danger
--destructive-foreground: hsl(0 0% 100%)
--border:           hsl(214 32% 91%)     neutral-200
--input:            hsl(214 32% 91%)     neutral-200
--ring:             hsl(221 83% 53%)     brand-600 (focus ring)
--gold:             hsl(25 95% 53%)      gold-500
--gold-foreground:  hsl(224 71% 4%)
--surface-elevated: hsl(0 0% 100%)       elevated card
--radius:           12px
```

### 1.8 Semantic Token Map (Dark Theme)

```
--background:       hsl(222 39% 9%)      forest-950
--foreground:       hsl(0 0% 98%)
--card:             hsl(222 39% 11%)     forest-900
--card-foreground:  hsl(0 0% 98%)
--primary:          hsl(217 91% 60%)     brand-500
--primary-foreground: hsl(224 71% 4%)
--secondary:        hsl(217 33% 17%)     forest-800
--secondary-foreground: hsl(0 0% 98%)
--muted:            hsl(217 33% 17%)     forest-800
--muted-foreground: hsl(215 16% 47%)     neutral-400
--accent:           hsl(217 33% 17%)     forest-800
--accent-foreground: hsl(213 94% 68%)    brand-400
--destructive:      hsl(0 84% 60%)
--destructive-foreground: hsl(0 0% 100%)
--border:           hsl(217 33% 17%)     forest-800
--input:            hsl(217 33% 17%)     forest-800
--ring:             hsl(217 91% 60%)     brand-500
--gold:             hsl(27 96% 61%)      gold-400
--gold-foreground:  hsl(224 71% 4%)
--surface-elevated: hsl(217 33% 17%)     forest-800
```

### 1.9 Sidebar Tokens

```
Light Sidebar:
  --sidebar:                  hsl(0 0% 100%)
  --sidebar-foreground:       hsl(215 25% 27%)
  --sidebar-border:           hsl(214 32% 91%)
  --sidebar-accent:           hsl(214 100% 97%)
  --sidebar-accent-foreground: hsl(224 76% 48%)

Dark Sidebar:
  --sidebar:                  hsl(222 39% 11%)
  --sidebar-foreground:       hsl(0 0% 98%)
  --sidebar-border:           hsl(217 33% 17%)
  --sidebar-accent:           hsl(217 33% 17%)
  --sidebar-accent-foreground: hsl(213 94% 68%)
```

### 1.10 Typography

```
Font Families:
  --font-sans:   Inter, system-ui, -apple-system, sans-serif
  --font-serif:  Inter, system-ui, sans-serif
  --font-mono:   ui-monospace, "SF Mono", "Cascadia Code", monospace

Sizes:
  --text-xs:  0.75rem (12px)
  --text-sm:  0.875rem (14px)
  --text-base: 1rem (16px)
  --text-lg:   1.125rem (18px)
  --text-xl:   1.5rem (24px)
  --text-2xl:  2rem (32px)

Line Heights:
  --leading-tight:  1.25  (headings)
  --leading-normal: 1.45  (body)
  --leading-relaxed: 1.6  (descriptions)

Letter Spacing:
  --tracking-tight: -0.02em
  --tracking-wide:  0.05em
```

**Dashboard pages use Cormorant Garamond (serif, weights 300/400/500) for value numbers and DM Mono (weights 300/400) for labels — imported via Google Fonts dynamically.**

### 1.11 Border Radius Scale

```
--radius-sm:    6px
--radius-md:    8px    → buttons, inputs
--radius-lg:    12px   → cards, panels
--radius-xl:    16px   → premium cards, KPIs
--radius-2xl:   20px   → large panels
--radius-full:  9999px → pills, badges, round avatars
```

### 1.12 Shadow Scale

```
--shadow-xs:   0 1px 2px rgb(15 23 42 / 0.04)
--shadow-sm:   0 1px 3px rgb(15 23 42 / 0.06), 0 1px 2px rgb(15 23 42 / 0.04)
--shadow-md:   0 4px 12px rgb(15 23 42 / 0.06), 0 2px 4px rgb(15 23 42 / 0.04)
--shadow-lg:   0 8px 24px rgb(15 23 42 / 0.08), 0 4px 8px rgb(15 23 42 / 0.04)
--shadow-card: 0 1px 3px rgb(15 23 42 / 0.04), 0 6px 24px rgb(15 23 42 / 0.06)
--shadow-card-hover: 0 8px 32px rgb(37 99 235 / 0.08)
```

### 1.13 Global CSS Classes

```
.card:
  - 16px radius, white bg, 1px semi-transparent border
  - Triple shadow stack: 2px + 16px + inner top highlight
  - On hover: shadow deepens (4px + 32px), transform scales slightly

.card-dark:
  - Same as .card but with dark surface values

.dashboard-canvas:
  - Background: #f6f7f9 (subtle blue-gray tint)
  - Used on school dashboard pages

@keyframes shimmer:
  - Loading skeleton animation: translateX(-100%) → translateX(100%)
```

---

## 2. COMPONENT LIBRARY

All components live in `packages/ui-web/src/components/ui/`. Built on Radix primitives + Tailwind v4.

### 2.1 Button

| Variant | Visual Style | Use Case |
|---------|-------------|----------|
| `default` | `bg-primary text-primary-foreground` | Primary actions |
| `destructive` | `bg-destructive text-destructive-foreground` | Delete, deactivate, decline |
| `outline` | `border border-input bg-background` | Secondary actions |
| `secondary` | `bg-secondary text-secondary-foreground` | Tertiary actions |
| `ghost` | No background until hover | Inline actions, toolbar |
| `link` | `text-primary underline-offset-4` | Navigation-style buttons |

| Size | Height | Padding | Text |
|------|--------|---------|------|
| `default` | `h-10` | `px-4 py-2` | `text-sm` |
| `sm` | `h-9` | `px-3` | `text-xs` |
| `lg` | `h-11` | `px-8` | `text-base` |
| `icon` | `h-10 w-10` | centered | — |

**States:** default, hover, active, focus-visible (ring-2 ring-offset-2), disabled (opacity-50), loading (spinner replaces content)

**Props:** `variant`, `size`, `asChild` (for Link wrapping), `disabled`, `className`

### 2.2 Badge

**Variants:** `default` (primary bg), `secondary` (muted bg), `destructive` (red bg), `outline` (border only)

**Sizes:** One size only — `h-6 px-2.5 py-0.5 text-xs font-semibold rounded-full`

**Use cases:**
- Status indicators (admission status, payment status, case status)
- Role labels
- Count badges on nav items
- Filter chip labels

### 2.3 Card

**Sub-components:**
- `Card` — container with border, bg-card, shadow-sm, rounded-lg
- `CardHeader` — top section with padding, holds title + description
- `CardTitle` — `text-2xl font-semibold leading-none tracking-tight`
- `CardDescription` — `text-sm text-muted-foreground`
- `CardContent` — body padding container
- `CardFooter` — bottom section with padding and flex layout

**Hover enhancement:** The `.card` global class adds premium shadow + inner highlight on hover.

### 2.4 Table

**Sub-components:**
- `Table` — full-width container, `caption-bottom text-sm`
- `TableHeader` — sticky/top header group
- `TableBody` — scrollable body `[&_tr:last-child]:border-0`
- `TableRow` — `border-b transition-colors hover:bg-muted/50`
- `TableHead` — `h-12 px-4 text-left align-middle font-medium text-muted-foreground`
- `TableCell` — `p-4 align-middle`
- `TableCaption` — `mt-4 text-sm text-muted-foreground`

**Enterprise features:** TanStack Table v8 integration for sorting, filtering, column visibility, row selection, cursor pagination, and virtualized scroll for large datasets.

### 2.5 Skeleton

Loader placeholder: `animate-pulse rounded-md bg-muted`. Supports `className` for custom sizing.

### 2.6 Progress Strip

Horizontal progress bar: `bg-primary h-2 rounded-full transition-all`. Used in admissions pipeline, fee collection, grade completion.

### 2.7 Countdown Ring

SVG circular progress indicator. Used for MFA step-up countdown timers, break-glass session expiry.

### 2.8 Priority Badge

Severity-level badge with dedicated styling:
- `critical` (red)
- `high` (orange/warning)
- `medium` (amber)
- `low` (muted)

Used for risk cases and workflow escalation.

### 2.9 Segmented Control

Horizontal button-group toggle: multiple `<button>` segments, one `active`. Used for period filters (Week / Month / Quarter / Year), status filters (All / Pending / Approved).

### 2.10 Ledger Entry Table

Specialized double-entry ledger table with debit/credit columns, running balance, and immutable row styling.

### 2.11 Journal Voucher Card

Individual journal entry card showing: type, date, reference, debit (₦), credit (₦), status, and immutable indicator.

### 2.12 Currency Input

Number input with `₦` prefix. Converts Naira display to kobo internal value automatically. Accepts `value` in kobo, displays in Naira with thousands grouping.

### 2.13 Weight Ledger Bar

Weighted visual bar showing proportional distribution. Used in PSF allocation views.

### 2.14 Filter Chip Bar

Horizontal chip row for active filters: each chip shows `label`, value, and `×` remove button. Includes "Clear all" action.

### 2.15 Standard Form Components

| Component | States | Notes |
|-----------|--------|-------|
| Input | default, focus, disabled, error, with icon | Standard text/number/email input |
| Textarea | default, focus, disabled, error | Multi-line text |
| Select | default, focus, disabled, open, error | Dropdown with Radix Select |
| Checkbox | checked, unchecked, indeterminate, disabled, error | Radix Checkbox |
| Label | default, disabled, required (asterisk) | Associated with input via htmlFor |
| Form (FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage) | Valid, invalid, dirty | React Hook Form integration |

### 2.16 Overlay Components

| Component | Trigger | Content | Notes |
|-----------|---------|---------|-------|
| Dialog | Button/action click | Modal overlay with header/title/description/footer | Esc to close, click-outside to close, focus trap |
| Sheet | Button/action click | Slide-in panel (left/right/top/bottom) | Used for filter panels, detail drawers |
| Dropdown Menu | Click/right-click | Floating menu with items, separators, shortcuts | Navigation menus, row actions |
| Tooltip | Hover/focus | Floating label | Icon labels, truncated text reveal |
| Tabs | Click tab item | Content panels | Sub-navigation within pages |
| Separator | Static | Horizontal or vertical line | Section dividers |
| Alert | Static or dismissible | Status bar with icon + message + action | Success/warning/error banners |

---

## 3. APP-SPECIFIC COMPONENTS

### 3.1 KpiCard (`components/platform/kpi-card.tsx`)

The primary KPI metric card component used across all dashboards.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Uppercase mono label text (e.g., "TOTAL STUDENTS") |
| `value` | `string` | Yes | Large serif number (e.g., "1,247") |
| `subValue` | `string` | No | Small context text below the value |
| `change` | `number \| null` | No | Percentage change. Positive → green up arrow. Negative → red down arrow. null → hidden. |
| `changePeriod` | `string` | No | Period label (e.g., "vs last month") |
| `sparklineData` | `number[]` | No | Array of 12-24 data points for inline sparkline. Rendered on hover as a small SVG area chart. |

**Visual Design:**
- White card, rounded-xl (12px) border, subtle shadow
- Label: `text-[10px] font-mono uppercase tracking-[1.5px] text-muted-foreground`
- Value: `text-[26px] font-serif font-light tracking-tight` (Playfair Display or Cormorant Garamond)
- Change badge: rounded-full pill, green bg/text for positive, red for negative
- Hover: sparkline appears, subtle shadow lift

### 3.2 ConsoleMetricCard (`components/layout/loomis-console-layout.tsx`)

Premium glass-style metric card with shimmer effect. Used on the school console landing page.

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Title label |
| `value` | `string \| number` | Large metric number |
| `chart` | `ReactNode` | Optional SVG chart / sparkline |
| `sparklineData` | `number[]` | Mini line chart data |
| `isLoading` | `boolean` | Show skeleton |
| `trend` | `'up' \| 'down' \| 'neutral'` | Trend direction |
| `trendValue` | `string` | Trend percentage text |

**Visual Design:** Glass-style background with subtle gradient, decorative shimmer line on hover, Playfair Display value type.

### 3.3 Platform Revenue Chart (`components/platform/revenue-chart.tsx`)

Bar/area chart for platform revenue visualization. Uses Recharts.

### 3.4 Platform Revenue Line Chart (`components/platform/platform-revenue-line-chart.tsx`)

Line chart variant for revenue trends. Uses Recharts. Period-based data with tooltips showing Naira amounts.

### 3.5 Risk Summary Band (`components/platform/risk-summary-band.tsx`)

Horizontal band showing risk metrics at a glance: total active cases, critical cases, pending review, resolved this period. Each segment color-coded (red = critical, orange = high, etc.).

### 3.6 Risk Case Table (`components/platform/risk-case-table.tsx`)

Enterprise table for IVP anomaly cases. Columns: Tenant, Anomaly Score, Case Status, Priority, Opened, Assigned To. Row actions: View detail, update status.

### 3.7 PSF Rate Card (`components/platform/psf-rate-card.tsx`)

Card showing PSF rate configuration for a tenant tier: tier name, rate percentage, effective date, status. Used in PSF management views.

### 3.8 Admissions KPI Cards (`components/student/admissions-kpi-cards.tsx`)

Row of KPI cards for admissions pipeline: Total Applications, Pending Review, Approved, Declined, Conversion Rate. Used on the school admissions dashboard.

### 3.9 Nigeria Choropleth Map (`components/regional/nigeria-choropleth.tsx`)

SVG choropleth map of Nigeria states with color-coded data overlays. Used on the Regional dashboard for geographic analytics.

### 3.10 Regional Alerts Feed (`components/regional/regional-alerts-feed.tsx`)

Real-time alerts list for regional managers: school onboarding status, referral activity, anomaly flags.

---

## 4. SHELL & NAVIGATION SYSTEM

### 4.1 Shell Architecture

Every role group uses a consistent shell pattern:

```
┌──────────────────────────────────────────────────────┐
│  Auth Gate (loading → authenticated → unauthenticated) │
├──────────┬───────────────────────────────────────────┤
│          │  TOP BAR                                  │
│          │  [Workspace] [Search… ⌘K] [?] [Profile]  │
│  SIDEBAR │───────────────────────────────────────────│
│          │  CONTENT AREA (scrollable)                │
│  [Logo]  │  ┌─────────────────────────────────┐     │
│  [Nav]   │  │  PageHeader                      │     │
│  [Nav]   │  ├─────────────────────────────────┤     │
│  [Nav]   │  │  PageBody [max-w-7xl mx-auto]    │     │
│  [Nav]   │  │  Section 1: Header               │     │
│  ─────── │  │  Section 2: Summary (KPIs)        │     │
│  [Foot]  │  │  Section 3: Analytics             │     │
│          │  │  Section 4: Operations            │     │
│          │  │  Section 5: Quick Actions         │     │
│          │  └─────────────────────────────────┘     │
└──────────┴───────────────────────────────────────────┘
```

### 4.2 Shell Components

- **PlatformShell:** `AppShell` wrapper with `PlatformSidebar` + `PlatformTopBar` + `BreakGlassStrip` (when privilege escalation is active)
- **SchoolShell:** `AppShell` wrapper with `SchoolSidebar` + `SchoolTopBar`, content area uses `dashboard-canvas` class
- **RegionalShell:** Custom flex layout with `RegionalSidebar` + `RegionalTopBar`
- **ParentShell:** `ConsoleShell` wrapper with `ParentSidebar` + `ConsoleTopBar`
- **AppShell** (from `@loomis/ui-web`): Generic sidebar+topbar+content layout
- **ConsoleShell** (from `components/layout/console-shell.tsx`): Simpler variant for parent/student

### 4.3 Sidebar Components (from `@loomis/ui-web`)

| Component | Description |
|-----------|-------------|
| `SidebarBrand` | Logo area: "L" monogram (brand-600 bg, white text) + "Loomis" title + subtitle. Collapsed: monogram only. |
| `SidebarSectionLabel` | Section heading: `text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground` |
| `SidebarNavItem` | Row: rounded-square icon container (active = dark bg/white icon, inactive = transparent) + label + optional badge. Collapsed: icon-only centered. |
| `SidebarTrustCard` | Bottom info card: ShieldCheck icon + "Secure. Compliant. Trusted." + "Learn more →" link. Only in expanded state. |
| `SidebarUserProfile` | User row: purple circle with initials + name + role + green dot (online). Collapsed: initials icon only. |
| `SidebarFrame` | Sidebar shell: white bg, right border + shadow, 240px expanded / 72px collapsed, scrollable nav, optional footer. |

### 4.4 Top Bar Components

| Component | Used By | Features |
|-----------|---------|----------|
| `AppBar` | Platform, School | Workspace label, search input with ⌘K hint, notification bell with badge, user profile dropdown |
| `ConsoleTopBar` | Parent | Role label, tenant ID badge, user dropdown |
| `RegionalTopBar` | Regional | "Regional Console" title, "Partner" badge, user dropdown |
| `BreakGlassStrip` | Platform (topSlot) | Red banner with countdown timer when break-glass privilege escalation is active |

### 4.5 Sidebar Navigation — Platform

**Workspace Section** (visible to `platform_owner`, `platform_admin`):
```
Dashboard       → /platform/dashboard
Tenants         → /platform/tenants
PSF Rates       → /platform/psf
Ledger          → /platform/ledger
Approvals       → /platform/approvals
Risk Cases      → /platform/risk
Referrals       → /platform/referrals
KYC Verifications → /platform/referrals/kyc
```

**Compliance Section** (visible to `dpo`, `platform_owner`, `platform_admin`):
```
Compliance Posture   → /platform/compliance
DSAR Queue           → /platform/compliance/dsar
Breach Records       → /platform/compliance/breaches
Retention & Consent  → /platform/compliance/retention
Audit Log            → /platform/compliance/audit
```

**Footer:** Settings (`/platform/settings`), Log Out

### 4.6 Sidebar Navigation — School

**Workspace Section** (visibility controlled by capabilities):
```
Dashboard        → /school/dashboard                         [always visible]
Staff            → /school/staff                             [staff.onboard]
Students         → /school/students                          [admissions.*, student.promote]
Academic         → /school/sessions                          [academic_year.manage, term.*, census.lock]
Timetable        → /school/timetable                         [academic_year.manage, term.manage]
Assignments      → /school/assignments                       [gradebook.*]
Finance          → /school/finance                           [fee.configure, payment.*, refund.*]
PSF Obligations  → /school/finance/psf                       [fee.configure]
Exams            → /school/exams                             [grading_scheme.*, result.*, gradebook.read]
Gradebook        → /school/gradebook                         [gradebook.*]
Attendance       → /school/attendance                        [attendance.*]
Workflows        → /school/workflows                         [staff.onboard, refund.approve, result.publish]
Communications   → /school/comms                             [staff.onboard, attendance.mark, gradebook.read]
Settings         → /school/settings                          [always visible]
```

**Footer:** Settings, Log Out

### 4.7 Sidebar Navigation — Regional

```
Dashboard         → /regional/dashboard
Onboard School    → /regional/onboarding
Subordinates      → /regional/subordinates      [regional_manager only]
Referral Earnings → /regional/earnings
```

**Footer:** "Territory" label + "Nigeria · Read-only analytics"

### 4.8 Sidebar Navigation — Parent

```
Dashboard   → /parent/dashboard
Attendance  → /parent/attendance          [parent only]
Results     → /parent/results
Fees        → /parent/fees                [parent only]
Settings    → /parent/contact
```

### 4.9 Sidebar Navigation — Student

```
Dashboard   → /parent/dashboard
Results     → /parent/results
Timetable   → /parent/results
Assignments → /parent/results
Attendance  → /parent/attendance
```

### 4.10 Active State Indicators

| Shell | Active Style |
|-------|-------------|
| Platform | Black background icon, bold text |
| School | Black background icon, bold text |
| Regional | Gold left border (`border-gold-400`), gold background (`bg-gold-50`), gold text (`text-gold-700`) |
| Parent | Brand left border (`border-brand-600`), brand background (`bg-brand-50`), brand text (`text-brand-700`) |

---

## 5. PAGE TEMPLATES

### 5.1 The 5-Section Layout (Universal Template)

Every page in the platform follows this exact vertical rhythm:

```
┌────────────────────────────────────────────────────────┐
│  SECTION 1 — PAGE HEADER                               │
│  ┌──────────────────────────────────────────────┐      │
│  │ Breadcrumb (optional)                         │      │
│  │ Title (h1, serif, 22px, font-light)          │      │
│  │ Context description (mono, 11px, muted)      │      │
│  │                              [Primary Action] │      │
│  │                              [Secondary Action]│     │
│  └──────────────────────────────────────────────┘      │
├────────────────────────────────────────────────────────┤
│  SECTION 2 — SUMMARY (KPI Row)                         │
│  ▸ Section Label: "SUMMARY"                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │ KPI    │ │ KPI    │ │ KPI    │ │ KPI    │         │
│  │ Card   │ │ Card   │ │ Card   │ │ Card   │         │
│  └────────┘ └────────┘ └────────┘ └────────┘         │
│  4 cards in a row on desktop, 2 on tablet, 1 on mobile │
├────────────────────────────────────────────────────────┤
│  SECTION 3 — ANALYTICS                                   │
│  ▸ Section Label: "ANALYTICS"                           │
│  ┌──────────────┐ ┌──────────────┐                     │
│  │ Panel        │ │ Panel        │                     │
│  │ Chart/Graph  │ │ Big Number   │                     │
│  └──────────────┘ └──────────────┘                     │
│  ┌─────────────────────────────────────┐                │
│  │ Full-width Chart Panel              │                │
│  └─────────────────────────────────────┘                │
├────────────────────────────────────────────────────────┤
│  SECTION 4 — OPERATIONS                                  │
│  ▸ Section Label: "OPERATIONS"                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Panel    │ │ Panel    │ │ Panel    │               │
│  │ List/    │ │ Status   │ │ Ledger   │               │
│  │ Metrics  │ │ Feed     │ │ Note     │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│  ┌──────────────┐ ┌──────────────┐                     │
│  │ Table/Panel  │ │ Table/Panel  │                     │
│  │ Pending      │ │ Open Cases   │                     │
│  └──────────────┘ └──────────────┘                     │
├────────────────────────────────────────────────────────┤
│  SECTION 5 — QUICK ACTIONS                                │
│  ▸ Section Label: "QUICK ACTIONS"                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │ Action │ │ Action │ │ Action │ │ Action │         │
│  │ Card   │ │ Card   │ │ Card   │ │ Card   │         │
│  └────────┘ └────────┘ └────────┘ └────────┘         │
└────────────────────────────────────────────────────────┘
```

### 5.2 Section Label Component

```
▸ "SUMMARY"
  text-[10px] font-mono font-light uppercase tracking-[1.5px]
  text-muted-foreground (neutral-400)
  margin-bottom: 12px (mb-3)
```

### 5.3 Panel Component

```
Panel
  ▸ Rounded-xl (12px) border
  ▸ White bg (light) / forest-900 (dark)
  ▸ Padding: 20px (p-5)
  ▸ Header: mono 10px uppercase label + optional action link
  ▸ Body: variable content
```

### 5.4 Quick Action Card

```
QuickActionCard
  ▸ Rounded-xl border, white bg, p-4
  ▸ Flex row: icon (size-9 rounded-lg in brand-50/brand-300 bg) + label + description
  ▸ Hover: border becomes brand-500, subtle shadow lift, icon background becomes brand-500 solid with white icon
  ▸ ArrowRight icon on right edge, translates right on hover
```

### 5.5 Page Body

```
PageBody
  ▸ max-w-7xl mx-auto
  ▸ Padding: p-6 (mobile) / lg:p-8 (desktop)
  ▸ Flex-1 (fills remaining vertical space)
  ▸ Scrollable
```

### 5.6 Page Header

```
PageHeader
  ▸ Full-width strip: border-b, bg-card, px-6 py-5, shadow-xs
  ▸ Breadcrumb above title (optional)
  ▸ Title: font-serif text-xl font-semibold tracking-tight text-foreground
  ▸ Description: text-sm text-muted-foreground (optional)
  ▸ Actions slot on the right (flex-end, gap-2)
```

### 5.7 Responsive Breakpoints

```
Mobile:     < 640px  → 1 column grids, stacked panels
Tablet:     640-1024px → 2 column grids, medium cards
Desktop:    > 1024px → 4 column KPI grids, 2 column panels, full-width charts
```

---

## 6. DASHBOARD PAGE SPECS

### 6.1 Platform Owner Dashboard

**URL:** `/platform/dashboard`
**Role:** `platform_owner`, `platform_admin`

```
SECTION 1 — HEADER
  Breadcrumb: "Loomis · Platform"
  Title: "Platform Dashboard" (Cormorant Garamond, 22px, font-light)
  Description: "Aggregated revenue, risk, and operational oversight across all schools in the network."
  Primary Action: [View Tenants] button (outline, sm)
  Context: Live badge (green pulsing dot + "Live · Jun 2026")

SECTION 2 — SUMMARY
  4 KPI Cards:
    1. Active Schools (count + % change)
    2. PSF Billed (₦ value + % change)
    3. Settled (₦ value + % change)
    4. Outstanding (₦ value, destructive variant — red accent bar)

SECTION 3 — ANALYTICS
  Row 1 (2-column):
    - Settlement Split: Donut chart (gold/neutral) + percentage breakdown legend
    - Settlement Rate: Large percentage number (52px serif) + context values
  Row 2 (full-width):
    - Earnings Chart: Line chart (Nov–Jun, ₦ values, gold line with fill)

SECTION 4 — OPERATIONS
  Grid: 8-col left + 4-col right rail
  Left (3-column sub-grid):
    - Revenue Snapshot: Billed / Settled / Outstanding breakdown list
    - Platform Activity: Status feed (schools active, IVP cases, approvals)
    - Ledger Note: As-of timestamp + immutable data notice
  Right (stacked):
    - Pending Approvals: List of pending privileged changes (type + reason + Review link)
    - Open IVP Cases: List (tenant name + anomaly score + status badge)

SECTION 5 — QUICK ACTIONS
  4 Action Cards:
    1. Manage Tenants → /platform/tenants
    2. PSF Rates → /platform/psf
    3. Review Approvals → /platform/approvals
    4. Risk Centre → /platform/risk
```

### 6.2 School Owner Dashboard

**URL:** `/school/dashboard`
**Role:** All school roles (role-based capability filtering)

```
SECTION 1 — HEADER
  Title: "Welcome, {RoleName}" (PageHeader component)
  Description: "Your school console. Oversee academics, finance, and operations from one place."
  Primary Action: [Add Student] button (default, sm) + [Record Attendance] (outline, sm)

SECTION 2 — SUMMARY
  4 KpiCard components:
    1. Total Students (count, "Active enrollments" subtitle)
    2. Staff Members (count, "Teaching & admin" subtitle)
    3. Pending Admissions (count, "X approved this term" subtitle)
    4. Fee Collection (percentage or "—", "X students billed" subtitle)

SECTION 3 — ANALYTICS
  2-column grid:
    - Admissions Pipeline: 3 progress bars (Pending/Approved/Declined) with % and counts
    - Fee Overview: Charged/Paid/Outstanding breakdown with Naira values + collection rate badge

SECTION 4 — OPERATIONS
  2-column grid:
    - Pending Approvals: Workflow inbox items (title + workflowType + Review link)
    - Recent Admissions: Latest 5 admission applications (name + reference + status badge)

SECTION 5 — QUICK ACTIONS
  4 QuickActionCards:
    1. Add Student → /school/students/admissions
    2. Record Attendance → /school/attendance
    3. Log Payment → /school/finance/payments/log
    4. Send Announcement → /school/comms

SECTION 6 — MODULE ACCESS
  Grid of 2-3 column role-based cards (filtered by capability):
    Staff directory, Invite staff, Admissions, Fee configuration,
    Log payment, Verify payments, Outstanding balances, Refund approvals,
    Gradebook, Mark attendance, Academic sessions, Exam results,
    Timetable, Workflows, Communications, Settings
```

### 6.3 Regional Manager Dashboard

**URL:** `/regional/dashboard`
**Role:** `regional_manager`, `regional_subordinate`

```
SECTION 1 — HEADER
  Regional console title + role badge

SECTION 2 — SUMMARY
  KPI Cards: Partner Schools, Active Schools, Referral Earnings, Conversion Rate

SECTION 3 — ANALYTICS
  - Nigeria Choropleth Map (geographic distribution)
  - Referral Earnings Trend (bar chart)

SECTION 4 — OPERATIONS
  - Regional Alerts Feed
  - Subordinate Activity (manager only)

SECTION 5 — QUICK ACTIONS
  - Onboard School, View Earnings, Check Subordinates
```

### 6.4 Teacher Dashboard

**URL:** `/school/dashboard`
**Role:** `teacher`, `class_teacher`

Filtered version of school dashboard — shows only relevant KPIs and modules:
- KPI: My Students, Assignments Due, Attendance Rate
- Analytics: Grade Distribution, Assignment Completion
- Operations: Pending Grading, My Classes
- Quick Actions: Mark Attendance, Create Assignment, Enter Grades

### 6.5 Parent Dashboard

**URL:** `/parent/dashboard`
**Role:** `parent`

```
KPI: Child's Attendance %, Outstanding Fees, Latest Results
Analytics: Attendance Trend, Fee Payment History
Operations: Recent Results, Upcoming Events
Quick Actions: Pay Fees, Contact School, View Results
```

### 6.6 Student Dashboard

**URL:** `/parent/dashboard`
**Role:** `student`

```
KPI: Attendance %, Upcoming Assignments, Latest Results
Analytics: Grade Progress, Attendance Trend
Operations: Assignments Due, Class Schedule
Quick Actions: View Results, Check Timetable, Submit Assignment
```

---

## 7. FEATURE MODULE PAGE PATTERNS

### 7.1 List Pages (Table Pattern)

```
STRUCTURE:
  Header → Title + description + [Add New] action button + [Export] button
  Filter Bar → Search input + Filter Chips (status, date range, type)
  Table → Column headers (sortable) + rows (clickable → detail) + pagination
  Bulk Actions → Visible when rows selected
```

**Example:** `/school/students` — Student List

### 7.2 Detail Pages

```
STRUCTURE:
  Header → Title (entity name/ID) + status badge + [Edit] [Delete] actions + back link
  Summary Cards → Key attributes (name, DOB, class, admission date, status)
  Tabs → Overview / Academic / Finance / Documents (sub-navigation)
  Tab Content → Tab-specific lists, forms, or data
```

**Example:** `/school/students/[id]` — Student Profile

### 7.3 Form Pages (Create/Edit)

```
STRUCTURE:
  Header → "New {Entity}" or "Edit {Entity}" + [Save] [Cancel] buttons
  Form Body → Grouped fields in sections (Personal Info, Academic, Contact, etc.)
  Validation → Inline errors, required field markers (*)
  Footer → [Save] [Save & Add Another] [Cancel] (sticky at bottom)
```

**Example:** `/school/students/admissions/new` — New Admission

### 7.4 Approval / Workflow Pages

```
STRUCTURE:
  Header → Request title + status badge + due date indicator
  Request Summary → Key details of what's being approved
  Decision Actions → [Approve] [Reject] [Return for Revision] buttons
  History Timeline → List of previous steps and decisions
  Notes → Reason/comment textarea
```

---

## 8. ROLE-BASED CAPABILITY SYSTEM

### 8.1 Capability Types

```typescript
type Capability =
  | 'staff.onboard'          // Invite/onboard staff
  | 'admissions.manage'      // CRUD admissions
  | 'admissions.approve'     // Approve/decline applications
  | 'student.promote'        // Promote students
  | 'academic_year.manage'   // Create/manage academic years
  | 'term.manage'            // Configure terms
  | 'census.lock'            // Lock census (step-up MFA)
  | 'gradebook.write'        // Enter grades
  | 'gradebook.read'         // View grades
  | 'attendance.mark'        // Mark attendance
  | 'attendance.view'        // View attendance records
  | 'fee.configure'          // Set fee structures
  | 'payment.log'            // Log offline payments
  | 'payment.verify'         // Verify payments
  | 'refund.initiate'        // Initiate refunds
  | 'refund.approve'         // Approve refunds (step-up MFA)
  | 'grading_scheme.configure' // Configure grading
  | 'result.publish'         // Publish results (step-up MFA)
```

### 8.2 Capability Check Function

```typescript
can(role: string, capability: Capability): boolean
```

Used to:
- Show/hide navigation items in sidebar
- Show/hide action buttons in pages
- Filter dashboard module cards
- Gate access to routes

**Note:** This is UX gating only. Server enforces independently.

---

## 9. STATE & STATUS INDICATORS

### 9.1 Entity Statuses

| Status | Badge Style | Used For |
|--------|------------|----------|
| `active` / `approved` / `settled` / `completed` | Green bg + green text | Approved admissions, settled payments, active staff |
| `pending` / `draft` / `processing` | Amber/yellow bg + amber text | Pending admissions, draft terms, processing payments |
| `declined` / `rejected` / `cancelled` | Red bg + red text | Declined applications, rejected refunds |
| `closed` / `archived` | Neutral bg + muted text | Closed terms, archived years |
| `open` / `enrolled` | Blue bg + blue text | Open terms, enrolled students |
| `census_locked` | Purple bg + purple text | Census-locked terms |

### 9.2 Trend Indicators

```
↑ Green arrow  → Positive trend (e.g., revenue up, attendance up)
↓ Red arrow    → Negative trend (e.g., outstanding up, enrollment down)
→ Gray dash    → No change
```

### 9.3 Priority / Severity Indicators

```
Critical  → Red (anomaly score > 90)
High      → Orange (80-89)
Medium    → Amber (60-79)
Low       → Neutral (0-59)
```

### 9.4 Live / Real-Time Indicators

```
Live Badge: Green pulsing dot + "Live · {Month Year}"
Used on platform dashboard header
```

---

## 10. FORM DESIGN STANDARDS

### 10.1 Form Layout

```
┌─────────────────────────────────────────────────────┐
│  FORM TITLE                                          │
│  Form description text                               │
│                                                     │
│  ── SECTION HEADING ─────────────────────────────── │
│                                                     │
│  Label                                              │
│  [Input field                          ]            │
│  Helper text / error message                        │
│                                                     │
│  Label *                                            │
│  [Input field                          ] ◄ error    │
│  Error: This field is required                      │
│                                                     │
│  ── SECTION HEADING ─────────────────────────────── │
│                                                     │
│  [Save]  [Save & Add Another]  [Cancel]             │
└─────────────────────────────────────────────────────┘
```

### 10.2 Field States

```
Default:    border-input bg-background text-foreground
Focus:      border-ring ring-2 ring-ring/20
Disabled:   opacity-50 cursor-not-allowed bg-muted
Error:      border-destructive ring-destructive/20
Valid:      border-success (optional — only show if needed)
```

### 10.3 Required Fields

Marked with red asterisk `*` after the label.

### 10.4 Currency Fields

```
┌──────────────────────┐
│ ₦ [___________.__]   │  ← Input in Naira (e.g., ₦1,250.00)
└──────────────────────┘
Help text: "Enter amount in Naira"

Internal value: kobo (multiply by 100 before submit)
```

### 10.5 Financial / High-Risk Forms

Financial forms (refunds, census lock, result publish) require:
1. Step-up MFA modal before submit
2. Idempotency key (generated once, held across retries)
3. Disabled submit while in-flight
4. Clear success/error feedback

---

## 11. TABLE DESIGN STANDARDS

### 11.1 Enterprise Table Anatomy

```
┌──────────────────────────────────────────────────────────────┐
│  Title / Count (e.g., "1,247 students")     [Search…]  [Filters]  [Export] │
├──────────────────────────────────────────────────────────────┤
│  ☐ │ Name ▾      │ Class │ Status  │ Enrolled │ Actions    │
├────┼─────────────┼───────┼─────────┼──────────┼────────────┤
│  ☐ │ Jane Doe    │ JSS 1 │ Active  │ Jan 2025 │ ⋯ ▸       │
│  ☐ │ John Smith  │ JSS 2 │ Active  │ Sep 2024 │ ⋯ ▸       │
│  ☐ │ Mary Jones  │ SSS 1 │ Active  │ Jan 2025 │ ⋯ ▸       │
├────┼─────────────┼───────┼─────────┼──────────┼────────────┤
│  1-3 of 1,247   ← →  [10▼ per page]                          │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 Table Features

- **Column sorting:** Click header to toggle asc/desc; sort indicator arrow
- **Search:** Text input that filters rows client-side or triggers API search
- **Filter chips:** Status, date range, class level as removable chip tags
- **Bulk actions:** Checkbox column; select all/none; bulk action bar appears
- **Row actions:** "⋯" menu with Edit, View, Delete, etc. or inline action buttons
- **Pagination:** Previous/Next, page numbers, per-page selector, total count display
- **Empty state:** Centered icon + message + optional action button
- **Loading state:** Skeleton rows (3-5 shimmer rows)
- **Error state:** Error message with retry button

### 11.3 Status Column Styling

```
[Active]    → bg-green-50 text-green-700 rounded-full px-2 py-0.5
[Pending]   → bg-amber-50 text-amber-700
[Declined]  → bg-red-50 text-red-700
[Draft]     → bg-neutral-100 text-neutral-600
```

---

## 12. FULL PAGE INVENTORY

### 12.1 Platform Console (`/(platform)/platform/`)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/platform/dashboard` | Aggregated revenue, risk, operations |
| Tenants | `/platform/tenants` | Tenant list/management |
| Tenant Detail | `/platform/tenants/[id]` | Single tenant overview |
| PSF Rates | `/platform/psf` | PSF rate configuration |
| Ledger | `/platform/ledger` | Platform double-entry ledger |
| Approvals | `/platform/approvals` | Pending privileged change approvals |
| Risk Cases | `/platform/risk` | IVP anomaly case list |
| Risk Case Detail | `/platform/risk/[id]` | Single IVP case investigation |
| Referrals | `/platform/referrals` | Referral program management |
| KYC | `/platform/referrals/kyc` | KYC verification queue |
| Compliance | `/platform/compliance` | Compliance posture dashboard |
| DSAR Queue | `/platform/compliance/dsar` | Data subject access requests |
| Breaches | `/platform/compliance/breaches` | Breach records |
| Retention | `/platform/compliance/retention` | Retention & consent management |
| Audit Log | `/platform/compliance/audit` | Full audit trail |
| Settings | `/platform/settings` | Platform settings |

### 12.2 School Console (`/(school)/school/`)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/school/dashboard` | School overview with KPIs |
| Staff List | `/school/staff` | Staff directory |
| Invite Staff | `/school/staff/invite` | Staff onboarding form |
| Staff Detail | `/school/staff/[id]` | Staff profile |
| Students | `/school/students` | Student registry |
| Student Detail | `/school/students/[id]` | Student profile |
| Admissions | `/school/students/admissions` | Admissions pipeline |
| Academic | `/school/sessions` | Academic years & terms |
| Timetable | `/school/timetable` | Class schedule builder |
| Assignments | `/school/assignments` | Assignment management |
| Finance | `/school/finance` | Fee structures, invoices |
| Finance Detail | `/school/finance/[id]` | Fee structure detail |
| Payments | `/school/finance/payments` | Payment records |
| Log Payment | `/school/finance/payments/log` | Offline payment form |
| Verify Payments | `/school/finance/payments/verify` | Payment verification |
| Balances | `/school/finance/balances` | Outstanding balances |
| Refunds | `/school/finance/refunds` | Refund requests |
| PSF | `/school/finance/psf` | PSF obligation view |
| Exams | `/school/exams` | Exam management |
| Gradebook | `/school/gradebook` | Grade entry |
| Attendance | `/school/attendance` | Attendance records |
| Workflows | `/school/workflows` | Pending approvals |
| Workflow Detail | `/school/workflows/[id]` | Single workflow instance |
| Communications | `/school/comms` | Announcements & messages |
| HR | `/school/hr` | HR management |
| Settings | `/school/settings` | School settings |
| Settings/Appearance | `/school/settings/appearance` | Theme settings |

### 12.3 Regional Console (`/(regional)/regional/`)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/regional/dashboard` | Regional analytics |
| Onboarding | `/regional/onboarding` | School onboarding |
| Subordinates | `/regional/subordinates` | Subordinate management |
| Earnings | `/regional/earnings` | Referral earnings |

### 12.4 Parent Console (`/(parent)/parent/`)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/parent/dashboard` | Parent overview |
| Attendance | `/parent/attendance` | Child's attendance |
| Results | `/parent/results` | Child's exam results |
| Fees | `/parent/fees` | Fee payment & history |
| Settings | `/parent/contact` | Contact & settings |

### 12.5 Auth Pages (`/(auth)/`)

| Page | Route | Purpose |
|------|-------|---------|
| Login | `/login` | Email + password login |
| MFA Setup | `/mfa-setup` | TOTP enrollment |
| MFA Challenge | `/mfa` | Step-up MFA verification |
| Password Reset | `/reset-password` | Account recovery |

---

## 13. DESIGN SYSTEM RULES (for Figma Designers)

1. **Never change the sidebar, top bar, or global shell.** Those are locked. Only design the content area.
2. **All new pages MUST follow the 5-section template.** Header → Summary → Analytics → Operations → Quick Actions.
3. **Use existing design tokens.** Do not introduce new colors. Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`).
4. **Sections are separated by `space-y-7` (28px gap).** Panels within a section use `gap-3.5` (14px).
5. **KPI cards use serif font** (Playfair Display or Cormorant Garamond) for values, mono for labels.
6. **All tables must have:** search, filter chips, column sorting, bulk actions, pagination, status badges, row actions.
7. **Every empty state needs:** a centered icon (48px, muted color), a message line (mono 12px, muted), and optionally an action button.
8. **Every loading state uses:** Skeleton components (shimmer animation) matching the layout shape.
9. **Every error state shows:** an Alert component with error message + retry button.
10. **Quick actions use 4 cards max.** On mobile, stack to 1 or 2 columns.
11. **Colors have semantic meaning.** Green = positive/success, Red = danger/destructive, Amber = pending/warning, Blue = informational/primary, Purple = academic, Teal = engagement/attendance.
12. **Charts support decision-making.** Never use decorative charts. Line charts for trends, bar charts for comparisons, donut for proportions.
13. **Content is role-appropriate.** Don't show parent metrics to teachers, student metrics to finance officers, or platform metrics to students.
14. **Accessibility:** WCAG AA contrast, keyboard navigation, focus states on all interactive elements, screen-reader labels.
15. **Mobile-first responsive:** 1 column on mobile (< 640px), 2 columns on tablet, 4 columns on desktop (> 1024px).

---

*Loomis UI Design System Specification — authoritative handoff for Figma designers. Aligned with Frontend Architecture v1, design tokens, and the full component library. All measurements in pixels, all colors in HSL.*
