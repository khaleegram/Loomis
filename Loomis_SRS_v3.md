# SOFTWARE REQUIREMENTS SPECIFICATION
# Loomis School Management Platform — Multi-Tenant SaaS

| Field | Details |
|-------|---------|
| Document Version | 3.0 |
| Status | Draft — For Review |
| Prepared By | Engineering Team |
| Date | 10 June 2026 |
| Classification | Confidential |
| Intended Audience | Developers, QA Engineers, Product Owners, Legal, Compliance, Stakeholders |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | Prior release | Engineering Team | Initial SRS draft based on product specification |
| 2.0 | 05/06/2026 | Engineering Team | Platform renamed to Loomis; attendance ownership revised to Class Teachers; Class Teacher role expanded; subscription model changed to per-student fee; referral programme added; Regional Manager onboarding capability added; mobile app layer defined; configurable grading scheme added; Class Teacher gradebook view added |
| 3.0 | 10/06/2026 | Engineering Team | Revenue integrity overhaul: PSF moved to enrollment-liability model; Independent Verification Pipeline (IVP) introduced; enrollment attestation formalised as legal declaration; immutable double-entry platform ledger introduced; referral programme hardened with KYC gate, caps, and conflict-of-interest controls; tenant isolation upgraded to database-layer Row-Level Security; MFA made mandatory for all privileged roles; break-glass support access defined; Data Protection Officer role added; NDPA 2023 compliance requirements incorporated; 39 adversarial vulnerabilities addressed from Adversarial Analysis; Academic Session Management module added covering academic year lifecycle, term lifecycle, student promotion, and student graduation; HR and Staff Management module added; session management fully specified including concurrent session limits, idle timeout, and session revocation |

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for Loomis, a multi-tenant Software-as-a-Service (SaaS) school management platform. This document is the authoritative reference for developers, QA engineers, designers, legal counsel, and all stakeholders involved in the design, development, testing, and deployment of the system.

SRS v3 supersedes SRS v2 in its entirety. It incorporates all findings from the Loomis Adversarial Analysis (39 vulnerabilities) and the Revenue Integrity Architecture document.

### 1.2 Scope

Loomis is an education operations platform designed for private schools spanning nursery, primary, junior secondary, and senior secondary levels. The platform:

- Provides a unified infrastructure for academic management, finance, communication, and reporting.
- Supports strict multi-tenant isolation ensuring each school operates as an independent unit.
- Enables cross-tenant parent identity linking so parents with children in multiple schools maintain a single unified account.
- Offers regional oversight and school-onboarding capabilities for Regional Managers and their subordinates.
- Operates a per-student liability-based revenue model charged once per enrolled student per academic term, with platform-configurable rates.
- Supports a structured, KYC-gated referral programme that rewards Regional Managers and their subordinates for school onboarding, subject to earnings caps and conflict-of-interest controls.
- Provides native mobile applications for Parents, Students, Class Teachers, and Teachers.
- Supports fully configurable, per-tenant grading schemes to accommodate diverse assessment models.
- Maintains an immutable platform ledger and an Independent Verification Pipeline (IVP) to protect revenue integrity.
- Manages the full academic session lifecycle — academic year creation and activation, term creation and closure, student promotion across classes, and student graduation — as foundational operations on which all other modules depend.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition |
|----------------|------------|
| SaaS | Software as a Service |
| Tenant | An individual school instance provisioned on the platform with isolated data and configuration |
| RBAC | Role-Based Access Control |
| ABAC | Attribute-Based Access Control |
| RLS | Row-Level Security — a database-layer policy that enforces tenant isolation at the point of query execution |
| MRR / ARR | Monthly / Annual Recurring Revenue |
| PSF | Per-Student Fee — platform revenue charged once per enrolled billable student per academic term |
| PSF Obligation | The platform's record of PSF owed by a school for a specific student in a specific term; created at census lock, not at the point of payment |
| PSF Settlement | A record that a payment has partially or fully discharged a PSF obligation |
| Census Lock | The act of a School Owner or Principal attesting to and locking the official term enrollment count, which triggers creation of all PSF obligations for that term |
| IVP | Independent Verification Pipeline — the platform's multi-signal system for detecting enrollment underreporting |
| MTC | Minimum Term Commitment — a contractually agreed minimum billable student count per term |
| CA | Continuous Assessment |
| Grading Scheme | A tenant-defined configuration mapping assessment components to weighted score contributions |
| Referral Code | A unique identifier assigned to each Regional Manager and subordinate, used to attribute school onboardings and calculate referral earnings. Raw codes are never stored; only a cryptographic hash is retained. |
| Subordinate | A person operating under a Regional Manager who can onboard schools and earn referral income |
| Class Teacher | A Teacher with an additional role extension granting class-level oversight, attendance marking, and parent communication capabilities |
| Break-Glass Access | A time-limited, audit-logged, and tenant-notified emergency access mechanism for Platform Admins supporting a specific tenant |
| DPO | Data Protection Officer — the designated role responsible for NDPA compliance |
| NDPA | Nigeria Data Protection Act 2023 |
| NDPC | Nigeria Data Protection Commission |
| DSAR | Data Subject Access Request |
| SRS | Software Requirements Specification |
| OTP | One-Time Password |
| MFA | Multi-Factor Authentication — mandatory for all privileged roles in v3 |
| RPO / RTO | Recovery Point Objective / Recovery Time Objective |
| Idempotency Key | A unique client-supplied key that prevents a financial API call from being processed more than once regardless of retries |

### 1.4 References

- Loomis Revenue Integrity Architecture FINAL (10 June 2026)
- Loomis Adversarial Analysis (5 June 2026) — 39 platform vulnerabilities identified
- IEEE Std 830-1998 — Recommended Practice for Software Requirements Specifications
- OWASP Security Guidelines
- Nigeria Data Protection Act 2023

### 1.5 Document Overview

| Section | Contents |
|---------|----------|
| 1 | Introduction and scope |
| 2 | Overall system description and architecture |
| 3 | System actors and user roles |
| 4 | Functional requirements by module |
| 5 | Mobile application requirements |
| 6 | Non-functional requirements |
| 7 | System constraints and assumptions |
| 8 | Data model overview |
| 9 | Security requirements |
| 10 | Integration requirements |
| 11 | Appendices |

---

## 2. Overall System Description

### 2.1 Product Perspective

Loomis is a greenfield SaaS product operating as a standalone multi-layered platform. It integrates with third-party payment gateways, SMS and email notification providers, and cloud storage services. The platform includes both a web application and native mobile applications targeting the roles most dependent on real-time, on-the-go access.

### 2.2 System Architecture Overview

| Layer | Description | Isolation Scope |
|-------|-------------|-----------------|
| Platform Layer | SaaS infrastructure owner; manages all tenants, billing, global configuration, IVP, and referral programme | Global — no tenant restrictions |
| Regional Layer | Analytics, oversight, and onboarding layer. Regional Managers and subordinates can monitor schools and onboard new tenants | Read + Onboard; scoped to assigned region |
| School Layer (Tenant) | Core operational unit. Each school is a fully isolated tenant with independent data, configuration, and PSF billing | Strict tenant isolation — RLS and application layer |
| Parent Layer | Cross-tenant global users linked to children across multiple schools. Parent-student links require dual verification | Scoped to linked children only via tenant-scoped queries |
| Student Layer | Tenant-bound users with access limited to their enrolled school | Fully tenant-bound |
| Mobile Layer | Native mobile app exposing role-appropriate features to Parents, Students, Class Teachers, and Teachers | Same isolation rules as web layer |

### 2.3 Revenue Model

#### 2.3.1 Per-Student Fee (PSF) — Enrollment-Liability Model

From SRS v3 onwards, the PSF is no longer triggered at the point of fee payment. It is triggered by enrollment census lock — a signed attestation submitted by the School Owner or Principal at the start of each term.

The revised PSF model operates as follows. At census lock, the system creates one PSF obligation per billable enrolled student for that term. This obligation exists independently of whether any fee payment has been received or processed. Fee payments made through any channel — online gateway, cash, bank transfer, or POS — settle school invoices and are applied against the outstanding PSF obligations. The total PSF collected equals the full obligation per student regardless of how many installment tranches the school fee is split into.

The PSF rate is platform-configured. Per-school rate overrides require a two-person approval process and are permanently logged. The platform floor rate is the minimum allowable rate and cannot be set below it except by the Platform Owner. A rate of zero is permanently blocked in the system and cannot be set through any approval process.

PSF obligations are not reversed when a school requests a refund for school fees. PSF reversal is permitted only in cases of duplicate payment, platform error, provider chargeback, or legal compulsion, and requires Platform Revenue Operations approval in all cases.

#### 2.3.2 Minimum Term Commitment (MTC)

Each school agrees at onboarding to a Minimum Term Commitment — a minimum billable student count per term that is reviewed annually. If the actual billable count falls below the MTC, the school is billed at the MTC level. The Terms of Service include a True-Up Clause: if a platform audit finds that actual enrollment exceeds the attested count by more than ten percent, the school owes back-PSF for all underreported students plus a fifty percent penalty. Repeated deliberate underreporting may result in suspension or termination.

#### 2.3.3 Referral Programme

Every Regional Manager is issued a unique referral code upon completion of KYC verification and conflict-of-interest declaration. Subordinates operating under a Regional Manager are also issued unique sub-codes linked to their manager's code.

The referral programme in v3 operates under the following controls. Referral participants must complete identity verification (KYC) and submit a conflict-of-interest declaration before their code is activated and before any earning begins. Referral earnings accrue only from settled, non-disputed PSF obligations. Total referral payouts from any single tenant in a given payout period are capped at forty percent of PSF collected from that tenant in the same period, meaning the platform retains a minimum of sixty percent of PSF revenue at all times. Earnings are held during tenant revenue disputes or active IVP investigations. A Regional Manager does not automatically inherit a deactivated subordinate's earnings under any circumstance. Self-referral and undisclosed beneficial ownership of an attributed school trigger earnings hold and a forfeiture review.

### 2.4 Product Functions (High-Level)

1. Tenant Provisioning and Lifecycle Management
2. Academic Session Management — Academic Year Lifecycle, Term Lifecycle, Student Promotion, Student Graduation
3. Revenue Integrity — PSF Obligation Lifecycle, Independent Verification Pipeline, Enrollment Attestation, Platform Ledger
4. Academic Operations — Classes, Timetables, Exams, Grades, Results, Configurable Grading Schemes
5. Student Information System — Admissions, Enrollment, Census Attestation, Student Records
6. Financial Management — Fee Structure Configuration, Payments (Online and Offline), Receipts, Reconciliation
7. Referral Programme Management — KYC-gated, capped, conflict-of-interest controlled
8. Human Resources — Staff Onboarding, Role Assignment, Subject Assignment, Staff Deactivation
9. Communication — Messaging, Announcements, Notifications
10. Regional Analytics, Performance Benchmarking, and School Onboarding
11. Parent Portal — Multi-Child Tracking, Fee Payments, Communication
12. Mobile Applications — Parents, Students, Class Teachers, Teachers
13. Workflow and Approval Engine
14. Audit and Compliance — Immutable Logs, NDPA Compliance, DSAR, Breach Response

### 2.5 Operating Environment

- **Platform:** Cloud-hosted, multi-tenant web application
- **Web:** Browser-based (desktop and mobile responsive)
- **Mobile:** Native iOS 15 and above, and Android 10 and above
- **Connectivity:** Online-first; offline attendance marking and gradebook drafts supported on mobile
- **Database:** Row-Level Security enforced on all tenant-bound tables; logically or physically isolated per tenant depending on deployment tier

### 2.6 Design and Implementation Constraints

| ID | Constraint |
|----|------------|
| CON-001 | Each school (tenant) must be fully isolated at the data layer via Row-Level Security. No cross-tenant data exposure is permissible under any circumstance. |
| CON-002 | Parent identity resolution across tenants must never expose data from one school to another. Parent dashboards use separate tenant-scoped queries per linked child — no cross-tenant joins. |
| CON-003 | Attendance marking is exclusively a Class Teacher capability. Teachers shall not have any attendance-marking access. |
| CON-004 | Grade entry is exclusively a Teacher capability. Class Teachers have read-only access to the consolidated gradebook for their class. |
| CON-005 | Grading scheme weights must sum to exactly one hundred percent. The system shall enforce this at save time. |
| CON-006 | PSF obligations are created by term enrollment census lock, not by payment processing. No payment event — online or offline — triggers a PSF obligation. |
| CON-007 | Audit logs must be immutable, append-only, and retained for a minimum of five years with tamper-evident chaining. No user or administrator may delete or alter audit log entries. |
| CON-008 | All financial records must be immutable once confirmed. Corrections must use adjustment transactions, not edits to existing records. |
| CON-009 | Referral codes must be permanently attached to a school record at onboarding and cannot be retroactively changed or reassigned. |
| CON-010 | The mobile app must enforce the same RBAC and ABAC rules as the web application via shared server-side API enforcement. Client-side role checks are insufficient and may not be relied upon for access control. |
| CON-011 | A PSF rate of zero is permanently blocked in the system. It cannot be configured through any approval process, including Platform Owner override. |
| CON-012 | All financial write operations must accept and enforce an Idempotency Key to prevent duplicate processing. |
| CON-013 | All privileged platform actions — PSF rate changes, waivers, ledger adjustments, and support impersonation — require a two-person approval process. The person who requests an action cannot approve it. |
| CON-014 | The cashier who logs an offline payment is prohibited from verifying that same payment. Verification must be performed by a separately authorised user. |
| CON-015 | Referral participants cannot earn any referral income until both KYC verification and conflict-of-interest declaration have been approved by Platform Operations. |

### 2.7 Assumptions and Dependencies

| ID | Assumption |
|----|------------|
| ASM-001 | Schools have internet connectivity sufficient for web application use. |
| ASM-002 | Each school designates at least one School Owner and one Principal at onboarding. |
| ASM-003 | Parent email addresses are unique system-wide and serve as the primary cross-tenant identity key. They must be verified via OTP before any child link becomes active. |
| ASM-004 | Regional Managers and Subordinates are created by Platform Administrators or by Regional Managers for their own subordinates, subject to platform KYC approval. |
| ASM-005 | The platform integrates with at least three payment gateways simultaneously per deployment region to provide redundancy. |
| ASM-006 | Schools configure their own grading schemes, fee structures, academic calendar, and workflows during initial setup. |
| ASM-007 | Academic terms and grading schemes are defined per tenant and are not inherited from the platform. |
| ASM-008 | A Class Teacher is always also a Teacher. They hold both roles simultaneously; every Class Teacher is also a Teacher. |
| ASM-009 | The mobile app is the primary interface for most parents. Web access is secondary. |
| ASM-010 | Offline data stored on-device for attendance and gradebook drafts shall not be retained longer than seven days unsynced before the system prompts the user to resolve conflicts. |
| ASM-011 | The Terms of Service incorporate a PSF True-Up Clause and Minimum Term Commitment. These have been reviewed and approved by legal counsel. |
| ASM-012 | A Data Protection Officer role is designated and onboarded before the platform launches. |
| ASM-013 | Between forty and seventy percent of school fee payments in the Nigerian private school market are made offline via cash, bank transfer, or POS terminal. The platform is designed to operate correctly in this environment. |

---

## 3. System Actors & User Roles

### 3.1 Platform Layer Actors

#### 3.1.1 Platform Owner

| Attribute | Details |
|-----------|---------|
| Description | Executive-level user responsible for the overall Loomis product and commercial strategy |
| Access Scope | Global — all tenants, all regions, all data |
| Key Capabilities | Revenue analytics, tenant growth monitoring, PSF rate configuration, referral programme configuration, IVP investigation oversight, privileged change approval, daily digest of all privileged platform actions |
| Count | One to three (highly restricted) |
| Authentication | MFA mandatory; IP-restricted access recommended; step-up MFA required for all financial configuration changes |

#### 3.1.2 Platform Administrator

| Attribute | Details |
|-----------|---------|
| Description | Operational administrator responsible for school onboarding, billing, support, tenant lifecycle management, and IVP enforcement |
| Access Scope | Global — platform admin console |
| Key Capabilities | Create and suspend school tenants; adjust PSF rates (dual approval required); manage referral programme rules; handle support tickets through break-glass access; manage IVP anomaly cases; resolve enrollment attestation disputes |
| Authentication | MFA mandatory; step-up MFA for all privileged actions; break-glass sessions auto-expire after thirty minutes |

#### 3.1.3 Data Protection Officer (DPO) — New in v3

| Attribute | Details |
|-----------|---------|
| Description | Designated officer responsible for NDPA 2023 compliance, DSAR handling, and breach response |
| Access Scope | Platform-wide for compliance functions; scoped data access for investigations |
| Key Capabilities | DSAR queue management; breach assessment and notification workflow; consent management review; records of processing maintenance; compliance audit log access |
| Authentication | MFA mandatory |

### 3.2 Regional Layer Actors

#### 3.2.1 Regional Manager

| Attribute | Details |
|-----------|---------|
| Description | A cross-tenant actor assigned to monitor, benchmark, and grow schools within a defined geographic region. Also empowered to onboard new schools and manage subordinates. |
| Access Scope | Read (all schools in region) and School Onboarding and Subordinate Management |
| Key Capabilities | Regional dashboard, school comparison, onboard new schools using personal referral code, create and manage subordinates, referral earnings dashboard, alert monitoring, growth analytics |
| Restrictions | Cannot edit existing school operational data, approve grades or payments, or override school decisions. Cannot act as the oversight authority for schools where they earn referral income without independent platform review. |
| Referral Code | Cryptographic code with at least 96 bits of entropy, issued after KYC verification and conflict-of-interest declaration approval |
| Authentication | MFA mandatory |

#### 3.2.2 Regional Subordinate

| Attribute | Details |
|-----------|---------|
| Description | A person operating under a Regional Manager who can onboard schools and monitor schools within their portfolio. Their sub-code is linked to their manager's referral chain. |
| Access Scope | Read (schools they personally manage) and School Onboarding |
| Key Capabilities | Onboard schools using personal sub-code, view schools in their assigned portfolio, referral earnings dashboard |
| Restrictions | Cannot access the full regional dashboard of their parent Regional Manager; cannot create other subordinates; cannot earn referral income until KYC and conflict-of-interest declaration are approved by Platform Operations |
| Authentication | MFA mandatory |

### 3.3 School Layer Actors (Tenant-Bound)

| Role | Primary Responsibility | Key Access Areas |
|------|------------------------|-----------------|
| School Owner / Proprietor | Financial oversight, strategic decisions, census lock attestation | Revenue dashboard, enrollment overview, staff overview, PSF ledger summary, high-level approvals, census lock (MFA required) |
| Principal | Overall school operations, academic performance, census lock attestation, staff supervision | School performance dashboard, academic analytics, student tracking, approval workflows, census lock (MFA required) |
| Admin Officer (Registrar) | Admissions, student registration, transfers, parent link initiation | Admissions pipeline, student registry, parent link request initiation, enrollment tracking |
| Accountant / Bursar | Fee setup, financial tracking, offline payment verification, PSF reconciliation | Fee structure configuration, payment tracking, outstanding balances, financial reports, PSF obligation ledger |
| Cashier | Payment logging, receipt issuance, offline payment initiation | Payment logging, receipt generator, transaction logs. Cannot verify payments they have personally logged. |
| Exam Officer | Exam creation, grade processing, result publishing | Exam setup, grading scheme view, result publishing, transcripts |
| Deputy Exam Officer — New in v3 | Deputy to the Exam Officer; auto-activated after seventy-two hours of Exam Officer inactivity | Same capabilities as Exam Officer during activation period |
| Timetable Officer | Scheduling classes and managing timetables | Timetable builder, conflict detection, schedule optimisation |
| Teacher | Teaching, grading, assignments, learning materials. Does not mark attendance. | Gradebook for own subjects only (entry), assignment manager, learning materials upload, class subject dashboard |
| Class Teacher | Class-level oversight, attendance marking, parent communication, read-only consolidated gradebook. Every Class Teacher is also a Teacher. | Attendance tracker, class overview dashboard, read-only gradebook for all subjects in the class, parent messaging system, student progress summaries |

### 3.4 Cross-Tenant Actors

#### 3.4.1 Parent

| Attribute | Details |
|-----------|---------|
| Description | A global user not bound to a single tenant who monitors children enrolled across one or more schools |
| Access Scope | Scoped to linked children only, fetched via separate tenant-scoped queries per active parent-student link |
| Key Capabilities | Multi-child dashboard, academic tracking, financial hub, cross-school communication hub |
| Identity and Verification | A parent's email address is their global identity key. No child link becomes active until the parent has verified control of their email or phone via OTP. Admin Officers cannot finalise a parent link without parent consent. |
| Mobile | Full mobile application — the primary interface for most parents |

### 3.5 Student Actor (Tenant-Bound)

| Attribute | Details |
|-----------|---------|
| Description | A learner enrolled at a specific school; fully tenant-bound |
| Access Scope | Own data only within their enrolled school |
| Key Capabilities | View results, submit assignments, track attendance, access timetable, receive notifications |
| Mobile | Full mobile application available |

---

## 4. Functional Requirements

### 4.1 Platform Management Module

**FR-PLT-001: School Tenant Onboarding**
Platform Administrators and authorised Regional Layer actors shall be able to onboard a new school tenant. Onboarding requires the school name, region, contact details, and a referral code which is auto-populated when the onboarding is initiated by a Regional Manager or Subordinate. Upon creation the system shall provision a unique tenant ID, an isolated data environment with Row-Level Security policies, default role configuration, and initial School Owner credentials. The referral code used at onboarding shall be permanently linked to the school record for all future PSF attribution.

**FR-PLT-002: PSF Rate Management**
The platform shall maintain a default global PSF rate configurable by Platform Administrators. Platform Administrators shall be able to set a custom PSF rate for individual schools that overrides the global default. All rate changes — global or per-school — require a two-person approval process in which the person who submits the request is not the person who approves it. Rate changes are versioned with an effective date and are permanently audit-logged. They apply from the next billing term only and do not affect obligations already created. Current and historical PSF rates shall be visible in both the platform admin console and each school's financial dashboard. A PSF rate of zero cannot be set through any process.

**FR-PLT-003: Referral Programme Configuration**
Platform Administrators shall configure the referral percentage for Regional Managers for direct onboarding, the referral percentage for Regional Managers when a subordinate performs the onboarding, the referral percentage for Subordinates on their own onboardings, the payout schedule, the minimum payout threshold, and the maximum referral payout cap expressed as a percentage of PSF collected per tenant per period. Referral rules shall be versionable so that changes do not retroactively affect existing attribution agreements.

**FR-PLT-004: Feature Flag Control**
The Platform Owner shall be able to enable or disable specific features globally or per tenant without system downtime.

**FR-PLT-005: Global Analytics Dashboard**
The Platform Owner shall have access to a dashboard showing total active schools, total enrolled students, platform PSF revenue for the current term and over time, referral programme payouts, IVP anomaly summary, tenant growth over time, and system health indicators.

**FR-PLT-006: Support Ticket Management**
Platform Administrators shall create, assign, track, and resolve support tickets linked to specific tenants. A support ticket must exist and be referenced before a Platform Administrator can activate break-glass access to a tenant's data.

**FR-PLT-007: Privileged Change Request Workflow**
All high-risk platform actions shall be submitted as formal change requests that record the before and after state, the reason for the change, and a risk classification. Execution requires approval from a second authorised person who is not the requester. This applies to PSF rate overrides, PSF waivers, ledger adjustments, tenant suspension overrides, referral rule changes, support impersonation approvals, and bulk data exports.

---

### 4.2 Regional Layer Module

**FR-REG-001: School Onboarding by Regional Layer**
Regional Managers shall be able to initiate the full school onboarding flow from within their regional dashboard. Regional Subordinates shall be able to initiate school onboarding using their personal sub-code. Upon submission the platform auto-populates the referral code field with the initiator's code and routes the provisioning request through the standard onboarding workflow. Onboarded schools appear in the Regional Manager's portfolio upon activation.

**FR-REG-002: Subordinate Management**
Regional Managers shall be able to create, view, and deactivate Regional Subordinate accounts within their hierarchy. Each created Subordinate shall remain inactive and unable to earn referral income until KYC verification and conflict-of-interest declaration are approved by Platform Operations. The creating Regional Manager cannot approve the KYC of their own subordinate. Each activated Subordinate receives a unique sub-code linked to their Regional Manager's referral chain.

**FR-REG-003: Referral Earnings Dashboard**
Regional Managers shall see a dashboard showing total schools in their referral network, PSF collected from each school in the current term, their earnings per school, subordinate-attributed earnings, total payout to date, and next scheduled payout. Earnings that are on hold due to disputes or IVP investigations shall be clearly flagged. Regional Subordinates shall see an equivalent view scoped to their onboarded schools only.

**FR-REG-004: Regional Analytics Dashboard**
Regional Managers shall view a read-only dashboard for all schools in their region showing aggregated data only — total schools, total students, enrollment trends, attendance averages, and revenue performance comparisons. No student-level individual data shall be accessible to Regional Managers.

**FR-REG-005: School Comparison Engine**
The system shall rank and benchmark schools within a region on academic performance, fee collection efficiency, attendance rates, student growth, and retention metrics.

**FR-REG-006: Alert System**
Automated alerts shall notify Regional Managers of attendance drops below a configured threshold, significant revenue decline, academic underperformance, and system anomalies within a tenant. Regional Managers shall not receive alerts that would disclose IVP investigation details or revenue integrity findings relating to schools where they earn referral income, in order to preserve independence of oversight.

**FR-REG-007: Access Restrictions**
Regional layer actors shall have strictly read-only access to existing school operational data. The system shall technically prevent write operations on school records, grade approvals, payment overrides, and any other school-level data from Regional Layer accounts.

---

### 4.3 Academic Session Management Module

Academic session management is the foundational module of the platform. All other academic, financial, and operational modules depend on an active academic year and an open term. No attendance can be marked, no grades entered, no fees billed, no PSF obligations created, and no results published unless a valid term is in an open state.

**FR-ASM-001: Academic Year Creation**
The Principal or School Owner shall be able to create a new academic year for their tenant. The academic year record shall capture a unique name or label (for example "2026/2027"), a start month, an end month, and the number of terms the year is divided into. Only one academic year may be in an active or open state at any given time per tenant. The system shall prevent creation of an academic year whose date range overlaps with an existing academic year for the same tenant. The Platform Administrator may also create or correct academic year records on behalf of a tenant during onboarding support.

**FR-ASM-002: Academic Year Activation**
A newly created academic year begins in a draft state. The Principal or School Owner shall activate the academic year when they are ready to begin operations for that year. Activation shall be blocked unless all terms in the previous academic year are in a closed state and all PSF obligations from the previous year are settled, approved, or written off. Upon activation, the system shall create the configured number of term records for the year in a draft state, each with a placeholder start date, end date, and census lock date that the school configures before opening each term. Activation is an irreversible action — a year cannot be moved back to draft once activated.

**FR-ASM-003: Academic Year Closure**
The Principal or School Owner shall close an academic year once all terms within it are closed. The system shall block academic year closure unless every term within the year is in a closed state. Upon closure, the academic year transitions to an archived state. All records — students, grades, attendance, results, and financial entries — from the archived year remain permanently readable but no new records may be created against it.

**FR-ASM-004: Term Configuration**
Each term record created at academic year activation shall be configured by the Principal, School Owner, or Timetable Officer before it is opened. Configuration includes the term name or number, the start date, the end date, the enrollment window open and close dates, the census lock date, and the examination period dates. The census lock date must fall within the term's start and end dates. The enrollment window close date must fall before or on the census lock date. Term configuration may be adjusted while the term is in a draft state; it cannot be changed once the term is open.

**FR-ASM-005: Term Opening**
The Principal or School Owner shall open a term when the school is ready to begin operations for that term. Opening a term moves it from draft to open and triggers the following system actions: the enrollment window opens for student registration and class assignment; fee structures configured for the term become active and visible to the Accountant; any grading scheme published for the term becomes active and governs Teacher gradebooks; and timetable configuration for the term becomes editable by the Timetable Officer. Only one term per academic year may be in an open state at a time. The system shall prevent opening a term if the previous term in the same year is not yet closed.

**FR-ASM-006: Term Closure**
The Principal or School Owner shall close a term at the end of the term period. Term closure is a gated operation. The system shall block term closure unless all of the following conditions are satisfied: all PSF obligations for the term are in a settled, platform-approved waived, platform-approved disputed, or platform-approved payment plan status; no offline payments for the term remain in an unverified state beyond the configured grace period; all subject Teachers have locked their gradebooks for the term; the Exam Officer has published results for all active students; all pending grade correction workflow requests for the term are resolved; and no open IVP investigation case flagging the term's enrollment remains unresolved. The Principal may acknowledge and override specific non-critical blockers by providing a documented reason, which is permanently audit-logged. Financial blockers — unsettled PSF obligations and unverified offline payments — cannot be overridden by the school and require platform approval. Upon successful closure, the term moves to a closed state, all student term enrollment records for the term are locked, and report cards for the term become downloadable by parents and students.

**FR-ASM-007: Student Promotion**
At the conclusion of an academic year — before the next academic year is activated — the Principal or Admin Officer shall run the student promotion process. The promotion process assigns each currently enrolled student to a class in the next academic year. The system shall present a promotion interface listing all active students grouped by their current class, each with a proposed destination class for the new year based on the school's configured class progression structure. The Principal or Admin Officer shall review and confirm or adjust each assignment. A student may be flagged as held back, meaning they are assigned to remain in the same class level for the next year rather than progressing. Students who have been marked as graduated shall not appear in the promotion list. Promotion assignments shall not take effect until the new academic year is activated and a term within it is opened. The promotion record shall be permanently stored, linking the student's class in the closed year to their class in the new year, and the held-back flag shall be recorded with a documented reason. The class assignment produced by promotion is the default starting class for the student in the new term enrollment record when the next term is opened.

**FR-ASM-008: Student Graduation**
The Principal or Admin Officer shall mark final-year students as graduated at the end of their last academic year. Graduation is performed as part of or after the promotion process. Graduated students shall have their status changed to graduated and shall not appear in enrollment records or PSF obligations for any future term. Their complete academic records — results, attendance, grades, report cards, and payment history — shall remain permanently readable by the school, by linked parents, and by the student themselves. The system shall generate a leaving certificate or academic transcript for each graduated student upon request from the Exam Officer or Principal. A graduated student cannot be re-enrolled unless the Admin Officer explicitly re-admits them through the standard admissions pipeline, which creates a fresh student record linked to the original for continuity.

**FR-ASM-009: Class Structure and Rollover**
Each tenant shall configure a class structure defining the class levels and arms or streams within each level — for example JSS1A, JSS1B, JSS2A, and so on. The class progression map defines which class level a student moves to at the end of a year — for example JSS2 follows JSS1, SS3 is a terminal level. The system shall use this progression map to suggest promotion destinations during the promotion process described in FR-ASM-007. When a new academic year is activated, the system shall create fresh class records for the new year based on the existing class structure. Teachers and Class Teachers shall be reassigned to classes for the new year by the Principal or Admin Officer as part of session setup. The previous year's class assignments shall remain attached to that year's records and shall not be overwritten.

**FR-ASM-010: Academic Calendar**
Each tenant shall be able to define an academic calendar for each term, recording key dates such as term start and end, mid-term break, examination start and end, result day, and public holidays. Calendar entries shall be visible to all school users — staff, students, and parents — through the relevant dashboards and mobile apps. Calendar entries do not enforce system behaviour on their own; they are informational. The census lock date and enrollment window dates defined in term configuration are the operationally enforced dates for financial and billing purposes.

---

### 4.4 Student Information System

**FR-SIS-001: Admissions Pipeline**
Admin Officers shall create, manage, and track student applications through configurable admission stages. Admission decisions shall support approval workflow routing to the Principal where configured.

**FR-SIS-002: Student Registration**
The system shall capture comprehensive student profiles including personal information, guardian and parent details, academic history, medical notes, and uploaded documentation. Each student shall receive a unique student identifier within the tenant. At least one identity attestation — such as a birth certificate, previous school record, admission photograph, or parent consent verification — must be on file before a student can be marked as billable for PSF purposes.

**FR-SIS-003: Parent Linking System**
Admin Officers shall initiate a parent link request that associates a student with a parent account. A parent-student link shall not become active until two conditions are met: the school has attested to the relationship, and the parent has independently verified control of their registered email address or phone number via OTP. If the parent's email address already exists in the platform as an existing account, the link approval notification shall be sent only to the verified channels of that existing account. It shall not be possible for an Admin Officer to create a new account that overrides an existing parent identity. Link requests that are not acted upon by the parent expire after forty-eight hours.

**FR-SIS-004: Student Transfer Management**
The system shall support inter-school student transfers, producing a transfer certificate and updating enrollment records at both the originating and receiving schools where applicable. Transfer history shall be retained permanently in the student's academic record.

**FR-SIS-005: Enrollment Tracking**
Real-time enrollment counts by class, year, and overall school population shall be maintained and visualised on administrative dashboards.

**FR-SIS-006: Term Census Lock and Enrollment Attestation**
At the close of the enrollment window for each term, the School Owner or Principal shall submit a formal term census attestation using multi-factor authentication. The attestation declares the total billable student count and is treated by the platform as a legally binding declaration. The system shall require that the declared count matches the active billable term enrollments on record, with any variance requiring a documented reason. The census lock shall be blocked if duplicate admission numbers, unresolved parent link conflicts, or unapproved exemptions exist. Upon successful census lock, the system shall automatically create one PSF obligation per billable enrolled student for that term.

**FR-SIS-007: Student Activity Evidence Tracking**
The system shall continuously record student activity evidence for each enrolled student in a term. Activity evidence includes attendance being marked, a grade being entered, an invoice being created, a payment being logged, a receipt being issued, a parent portal login occurring, a message being sent, a result being generated, an ID card being exported, or a document being uploaded. Students who generate activity evidence but are not declared billable by the school shall be automatically flagged for billable status review.

**FR-SIS-008: Ghost Student Detection**
The platform shall run weekly automated checks to identify students with zero attendance records, zero gradebook entries, zero payments, and zero parent portal activity within thirty days of enrollment. Students meeting this profile shall be flagged for administrative review. Staff accounts that create a large number of student records in a short time window shall also trigger a review alert.

---

### 4.5 Academic Management Module

**FR-ACA-001: Timetable Management**
Timetable Officers shall create and publish class schedules per academic term with automated conflict detection. Published timetables shall be accessible to Class Teachers, Teachers, and Students.

**FR-ACA-002: Attendance Tracking**
Attendance marking is exclusively the responsibility of Class Teachers. Regular Teachers do not have any attendance marking capability. Class Teachers shall mark attendance per class session — present, absent, late, or excused — for all students in their assigned class. Attendance records shall be aggregated per student, per class, and per period. Class Teachers shall receive automated alerts when a student's cumulative attendance falls below a configured threshold. Attendance marking shall be available on the Loomis mobile app for Class Teachers with offline support.

**FR-ACA-003: Assignment Management**
Teachers shall create assignments with a title, instructions, due date, and attached resources. Students shall submit assignments digitally or receive submission tracking for offline work. Teachers shall grade submitted assignments within their subject gradebook.

**FR-ACA-004: Configurable Grading Scheme**
Each tenant shall configure a custom grading scheme that defines how marks are distributed across assessment components. Assessment components may include Weekly or Mini Tests, Assignments, Mid-Term Tests, Terminal Examinations, Projects, Practicals, and any custom-named component defined by the tenant. Each component is assigned a weight expressed as a percentage. The sum of all component weights must equal exactly one hundred percent, and the system shall enforce this at save time. A school may maintain different grading schemes for different class levels. Each published scheme is versioned per academic term and does not retroactively affect closed-term records.

**FR-ACA-005: Teacher Gradebook**
Each Teacher shall have a gradebook scoped to their assigned subjects and classes. The gradebook shall display score-entry fields for each assessment component defined in the active grading scheme. A Teacher can only view and enter grades for their own subjects. They cannot view grades from other subjects. Once a Teacher locks a grading period, scores cannot be changed without a formal Grade Correction workflow request.

**FR-ACA-006: Class Teacher Gradebook View**
Class Teachers shall have access to a consolidated read-only gradebook for their entire class showing all subjects and all students. This view aggregates scores submitted by all subject Teachers, presenting them in a unified matrix of students, subjects, and components. Class Teachers shall not modify, override, or delete any grade entry. All grade changes must go through the Grade Correction workflow. The class gradebook view shall highlight incomplete submissions so the Class Teacher can follow up with the relevant subject Teachers.

**FR-ACA-007: Exam and Result Management**
Exam Officers shall configure exam schedules, subject mappings, and grading scheme weightings per term. The system shall compute final results based on the active grading scheme, pulling scores from each Teacher's gradebook. Before publishing results, a validation report must be completed confirming all scores are entered and the grading scheme is correctly applied. Exam Officers shall publish results and generate printable report cards and transcripts. Result publishing shall be gated on PSF obligation settlement for each student — a student whose PSF obligation for the term is unsettled shall not have their results published or their report card generated. Result publishing shall trigger notifications to parents and students.

**FR-ACA-008: Deputy Exam Officer and Escalation**
Each Exam Officer shall have at least one designated Deputy Exam Officer. If the Exam Officer is inactive for seventy-two hours, the Deputy Exam Officer is automatically activated and can perform all Exam Officer functions. If no Deputy is active after forty-eight hours of the SLA deadline, the Principal shall have an emergency result publishing path requiring multi-factor authentication. All actions taken by a Deputy or through emergency escalation shall be logged and the primary Exam Officer notified.

**FR-ACA-009: Learning Materials**
Teachers shall upload learning materials — documents, videos, and links — organised by subject and term, accessible to students in their assigned classes.

**FR-ACA-010: Class Teacher Dashboard**
Class Teachers shall have a dedicated class dashboard showing the class attendance summary, student welfare flags, parent communication quick-access, student list with performance indicators, and a status view of pending gradebook submissions by subject Teachers.

**FR-ACA-011: Grade Correction Workflow**
A Teacher who needs to amend a locked grade must submit a Grade Correction request specifying the subject, student, original score, proposed score, and justification. The request is routed to the Exam Officer and then the Principal for sequential approval. Only upon final approval shall the system update the grade record. The audit log shall retain both the original and corrected values along with the full approver chain. Grade correction workflows shall have a configurable time limit per approval step, with automatic escalation to a deputy or the Principal if the step is not completed within the limit. A bulk correction workflow mode shall be available for systemic errors affecting many students at once. The system shall flag suspicious correction patterns — including repeated upward corrections, corrections near ranking boundaries, and corrections initiated and approved by the same circle of users — for platform review.

---

### 4.6 Financial Management Module

**FR-FIN-001: Fee Structure Configuration**
Accountants and Bursars shall define fee schedules per class, term, and academic year with categorised fee items. Fee discounts and scholarship arrangements shall be linkable to individual student records and must be reflected in each student's billable or exempt status in the enrollment record for that term.

**FR-FIN-002: PSF Obligation Lifecycle**
The PSF shall not be triggered by any payment event. It shall be triggered exclusively by the term census lock as described in FR-SIS-006. From that point:

One PSF obligation is created per billable enrolled student at census lock. For students enrolled after census lock, a PSF obligation is created immediately upon enrollment being confirmed. Each payment made by a parent — whether online, offline, through cash, bank transfer, or POS — is applied to settle the corresponding PSF obligation proportionally. The total PSF settled across all payments always equals the full obligation amount regardless of how many installment tranches are used. A student whose PSF obligation remains unsettled at the end of term is blocked from result publication, report card generation, and parent portal access to academic records for that term. The system shall prevent term closure until all PSF obligations for the term are in a settled, platform-approved disputed, platform-approved waived, or platform-approved payment plan status.

**FR-FIN-003: Referral PSF Attribution**
Each settled PSF obligation shall carry metadata linking it to the referral code associated with the school. The platform billing engine shall use this metadata to calculate referral earnings for the relevant Regional Manager and Subordinate at each payout cycle. Referral earnings are computed against settled obligations only — they do not accrue from pending or disputed obligations.

**FR-FIN-004: Payment Tracking and Receipt Generation**
Every payment transaction shall be recorded with the student identifier, total amount, PSF component, date, payment method, and the identity of the staff member who logged or initiated it. Outstanding balances shall be computed automatically. Digital receipts shall be issued upon payment verification — not upon logging alone in the case of offline payments. Receipts shall be downloadable as PDF and optionally emailed to the parent.

**FR-FIN-005: Offline Payment Logging and Verification**
Cashiers shall log payments made offline by entering the payment details and attaching evidence such as a receipt image or bank slip. Offline payments shall remain in a pending verification status until a separately authorised Accountant reviews and verifies them. The staff member who logged the payment is technically prevented from verifying that same payment. Offline payments that remain unverified for more than three business days shall generate automated alerts to the tenant and to Platform Operations. Offline payments that remain unverified for more than seven calendar days shall block term closure and shall prevent release of final results and receipts tied to those payments. The system shall escalate aging unverified payments progressively: first to the Accountant as a reminder, then to the Principal, and then to Platform Operations.

**FR-FIN-006: Financial Reports**
Reports shall include daily and monthly collection summaries, outstanding balances, term revenue versus target, PSF obligation and settlement summary, referral earnings breakdown, offline payment aging report, receipt sequence gap report, and PSF waiver and write-off history. Reports shall be exportable in CSV and PDF formats.

**FR-FIN-007: Refund Workflow**
Refund requests shall be routed through a configurable approval chain. A refund does not reverse a PSF obligation. PSF reversal is permitted only in the following cases: duplicate payment, platform error, provider chargeback, or legal compulsion. In all such cases, PSF reversal requires Platform Revenue Operations approval and is recorded as a separate adjustment in the platform ledger. When the volume of refunds from a single tenant within a term exceeds a configured threshold, a Revenue Risk review is automatically triggered.

**FR-FIN-008: Immutable Platform Ledger**
The platform shall maintain an immutable double-entry ledger recording all financial activity. Every PSF obligation created, every settlement received, every refund processed, every referral payout disbursed, and every manual adjustment shall create a balanced ledger transaction in which the total of debit entries equals the total of credit entries. Ledger entries are permanent and cannot be deleted or edited. Errors are corrected only by creating a new offsetting adjustment entry, which itself requires two-person approval. The platform shall run a nightly balance check to detect any ledger imbalance.

**FR-FIN-009: Bank Statement Reconciliation**
The platform shall support bank statement upload with automated analysis to match offline bank transfer payments to platform payment records. Where automatic matching is unavailable, unmatched bank transfers shall require dual manual verification. The system shall flag uploaded documents that contain anomalous patterns — such as identical amounts from different payers or implausible round-number sequences — for manual review.

**FR-FIN-010: Revenue Risk Scoring**
The platform shall compute a revenue risk score per tenant per term using the following inputs: the variance between declared enrollment and IVP-estimated enrollment, the ratio of offline to total payments, the age of unverified offline payments, the density of student activity evidence relative to enrollment, the trend of enrollment across terms, gaps in the receipt sequence, and the pattern of refund requests. Risk scores above a configurable threshold shall generate automated alerts to Platform Revenue Operations.

---

### 4.7 Communication Module

**FR-COM-001: Messaging System**
Class Teachers shall send messages to individual parents or to all parents within their assigned class. Admin Officers and Principals shall broadcast school-wide announcements. Parents receive messages from all linked schools in a unified inbox.

**FR-COM-002: Notification Engine**
Automated notifications shall be sent for result publication, payment receipt issuance (upon verification, not upon logging for offline payments), outstanding balance alerts, attendance threshold alerts, assignment deadline reminders, school announcements, offline payment aging alerts to tenants, IVP anomaly alerts to Platform Operations, and break-glass access alerts to School Owners. Delivery channels are in-app on web and mobile, email, and SMS where configured. Users shall be able to configure their notification preferences per channel.

---

### 4.8 Parent Portal

**FR-PAR-001: Multi-Child Dashboard**
Parents shall see all their linked children grouped by school with per-child at-a-glance summaries showing attendance, latest results, outstanding fees, and unread messages. This data shall be retrieved using separate queries per child's linked school — no cross-school data is fetched in a single query.

**FR-PAR-002: Academic Tracking**
Parents shall view published results per subject per term, attendance records, and teacher feedback for each linked child. Academic data for a given term is visible only once the student's PSF obligation for that term is settled.

**FR-PAR-003: Financial Hub**
Parents shall view fee schedules, payment history, and outstanding balances per child across all linked schools. Parents shall be able to initiate online fee payments through integrated payment gateways directly from the portal.

**FR-PAR-004: Communication Hub**
Parents shall receive and reply to messages from Class Teachers and school administrators. A unified notification feed aggregates messages from all linked schools in one view.

---

### 4.9 Student Portal

**FR-STU-001: Student Dashboard**
Students shall view their class timetable, upcoming assignments, attendance summary, and recent published results.

**FR-STU-002: Assignment Submission**
Students shall submit assignments digitally. Submission timestamps shall be recorded and flagged if submitted after the due date.

**FR-STU-003: Result Viewing**
Students shall view published results per term and download their report card as a PDF. Result viewing is gated on PSF obligation settlement for that term.

---

### 4.10 Workflow and Approval Engine

**FR-WFL-001: Configurable Workflows**
Schools shall configure approval workflows for refund requests, grade corrections, admission decisions, financial adjustments, and PSF waiver requests.

**FR-WFL-002: Grade Correction Workflow**
As described in FR-ACA-011, a Teacher who needs to amend a locked grade must submit a Grade Correction request. The request routes to the Exam Officer and then the Principal. Only upon final approval does the system update the grade record. The audit log retains both original and corrected values.

**FR-WFL-003: Workflow Execution**
Submitted workflow requests notify each approver in sequence via in-app notification and email. Approvers can approve, reject, or return the request with comments. Each step has a configurable time limit with automatic escalation if the deadline is missed. Final decisions automatically update the relevant record and notify all stakeholders.

**FR-WFL-004: Privileged Change Request Workflow**
As described in FR-PLT-007, all high-risk platform actions are submitted as formal change requests. The system prevents the requester from approving their own request. The before and after state, the reason, and the risk classification are permanently recorded. The affected tenant is notified where applicable after execution.

---

### 4.11 Audit and Compliance Module

**FR-AUD-001: Write Audit Logging**
Every write action in the system shall be logged with the user identifier, role, tenant identifier, action type, affected record references, timestamp, IP address, and device metadata. For sensitive mutations — such as changes to financial records, PSF rates, grades, and user identities — the log shall include a hash of the record state before and after the change. Audit logs are immutable. No user may delete or alter log entries.

**FR-AUD-002: Read Access Logging**
Read access to sensitive data shall be separately logged. Sensitive categories include student PII, financial records, health or medical data, child PII, and any bulk export. The read log shall record the accessing user, their role, the tenant in scope, the resource type accessed, the number of records accessed, whether child PII was included, whether financial data was included, and the business reason for access.

**FR-AUD-003: Audit Log Access**
Platform Administrators and the Data Protection Officer have access to audit logs across all tenants. School Owners and Principals have access to logs scoped to their tenant only.

**FR-AUD-004: Audit Log Retention and Archiving**
Audit logs shall be partitioned by month for query performance. Logs older than twelve months shall be archived to cold storage while remaining permanently immutable and accessible for compliance retrieval. All audit logs shall be retained for a minimum of five years. A tamper-evident hash chain shall be maintained across all log entries so that any deletion or alteration can be detected.

**FR-AUD-005: Compliance Reports**
The platform shall generate compliance reports from audit logs including: a privileged action summary, a PSF audit trail showing every obligation created and settled, an IVP investigation log, a DSAR fulfillment log, and a breach notification record.

---

### 4.12 Revenue Integrity and Fraud Prevention Module

**FR-RIN-001: Independent Verification Pipeline**
The platform shall maintain a daily snapshot system that collects seven independent enrollment proxy signals per tenant per term. These signals are: the reported enrollment count from the school's active term enrollment records; a payment volume proxy derived from total fee revenue divided by the expected average school fee per student; the number of unique students appearing in attendance records; the number of unique students appearing in the gradebook; the number of active classes multiplied by the configured average class size; the number of parent accounts linked and active for the tenant; and the number of unique students who have submitted assignments. Snapshots shall be taken nightly and retained for the full term.

**FR-RIN-002: IVP Anomaly Detection and Scoring**
The platform shall daily compute an anomaly score for each tenant by comparing the IVP signal-derived enrollment estimates against the school's reported enrollment using a weighted scoring model. The anomaly score ranges from zero to one. Scores above seventy percent shall automatically generate an IVP investigation case and notify Platform Operations.

**FR-RIN-003: IVP Enforcement Ladder**
When an IVP investigation case is opened, the platform shall apply a tiered enforcement approach. In the first week, the school receives an automated notice that the reported enrollment appears inconsistent with platform activity signals and is asked to review the attestation. In the second week, the school must submit a corrected attestation or provide documented evidence that supports the reported count. If the case remains unresolved into the third week, the school is placed in Verified Enrollment Mode and PSF is charged based on the IVP-estimated enrollment rather than the school's reported count. In the fourth week, Platform Operations is authorised to conduct a physical verification visit or video audit and may terminate the tenant for deliberate and sustained fraud.

**FR-RIN-004: Webhook Security and Idempotency**
All payment gateway webhooks shall be cryptographically verified using the provider's HMAC signature or public key before any processing occurs. Every received webhook event shall be stored in the platform's webhook event log before any business logic is executed. If a webhook event arrives with an event identifier that has already been processed, it shall be detected as a duplicate and rejected with a duplicate acknowledgement response. No business logic shall execute on a duplicate. Webhook events with timestamps outside a five-minute tolerance window shall be rejected.

**FR-RIN-005: Offline Payment Verification Segregation**
The system shall technically prevent the cashier who logged an offline payment from verifying that same payment. The verification step is server-side enforced. This ensures that a single individual cannot both create and confirm a fictitious payment record.

**FR-RIN-006: PSF Waiver Controls**
A PSF obligation waiver shall be submitted as a privileged change request and shall require a second Platform Administrator countersignature, a documented waiver reason, and a permanent audit log entry visible to the Platform Owner. Waived PSF amounts shall appear in a monthly Revenue Lost to Waivers report sent to the Platform Owner.

**FR-RIN-007: Receipt Sequence Integrity**
Payment receipts shall have immutable sequential numbering per tenant per term. Any gap in the receipt sequence shall require a documented explanation from an authorised user. Cashiers are technically prevented from deleting receipts or resetting receipt numbering sequences.

---

### 4.13 Referral Programme Management Module

**FR-REF-001: KYC Gate for Participants**
All referral participants — Regional Managers and Subordinates — shall complete government-issued identity verification before their referral code is activated. No referral earnings shall accrue to an unverified participant. Unverified participants may be limited to a nominal earning cap pending verification.

**FR-REF-002: Conflict-of-Interest Declaration**
All referral participants shall submit a conflict-of-interest declaration at onboarding and annually thereafter. A participant who declares a conflict — such as beneficial ownership of a school attributed to their code — shall have their earnings from that school flagged for independent platform review. A Regional Manager who has a declared conflict with a school shall not act as the oversight authority for that school.

**FR-REF-003: Referral Code Security**
Referral codes shall be generated with at least ninety-six bits of cryptographic entropy. The raw code shall be displayed exactly once at the time of generation and shall never be stored by the platform. Only the cryptographic hash of the code is stored. Rate limiting and CAPTCHA challenges shall be applied to any public-facing code entry flow to prevent enumeration attacks.

**FR-REF-004: Earning Cap Enforcement**
The total referral payouts disbursed to all participants attributed to a single tenant in any payout period shall not exceed forty percent of the PSF collected from that tenant in the same period. The system shall compute this cap before each payout cycle and shall hold any excess earnings to the following cycle.

**FR-REF-005: Conditions for Earning**
Referral earnings shall accrue only when all of the following conditions are satisfied simultaneously: the PSF obligation has been settled; the school referral attribution is in active status; the participant's KYC status is verified; and the tenant has no open IVP investigation case.

**FR-REF-006: Deactivated Participant Earning Policy**
When a referral participant is deactivated, all future earnings related to schools attributed to them shall be placed on hold. Held earnings may be paid out through a sunset period if the deactivation is without cause, forfeited to the platform if the deactivation is due to fraud or policy violation, or reassigned only with explicit Platform Operations approval. Under no circumstances shall a deactivated subordinate's earnings automatically transfer to their Regional Manager.

**FR-REF-007: Referral Payout Ledger**
All referral earning accruals and payout disbursements shall be recorded in the platform ledger as balanced transactions. Payout cycles shall generate immutable batch records. Participants shall be notified of each payout and the breakdown of schools and obligations from which their earnings were derived.

---

### 4.14 Human Resources and Staff Management Module

Staff management is the operational backbone that determines who can do what within a school. A Teacher cannot enter grades until they are assigned to a subject and class. A Class Teacher cannot mark attendance until they are assigned to a class arm. Role changes, subject reassignments, and staff deactivation all have cascading effects on data access and academic records.

**FR-HRM-001: Staff Onboarding**
The Principal or Admin Officer shall be able to create staff accounts for the following school-level roles: Principal, Admin Officer, Accountant, Cashier, Exam Officer, Deputy Exam Officer, Timetable Officer, Teacher, and Class Teacher. Creating a staff account requires the staff member's full name, personal email address, phone number, and the role to be assigned. A system-generated invitation shall be sent to the staff member's email with a one-time link to set their password. The invitation link shall expire after forty-eight hours. Until the staff member completes account setup, their account is in a pending status and they cannot access any system function. A staff profile record is created at the point of account creation and retains all assignment history permanently even after the staff member is deactivated.

**FR-HRM-002: Role Assignment and Role Changes**
Each staff member shall have exactly one primary role assigned at onboarding. The Class Teacher role is an extension that can be added to any Teacher account — it is not a standalone primary role. Additional role extensions, such as a Teacher also serving as an Exam Officer, shall be supported only where the two roles do not create a conflict of interest in the system's access control model. Role changes — including adding or removing the Class Teacher extension — shall require Principal or School Owner approval and shall be permanently audit-logged with the old role, the new role, the approver, and the effective timestamp. A role change takes effect immediately upon approval. Any active session the affected user holds shall be invalidated upon role change, requiring them to log in again under their new permissions.

**FR-HRM-003: Subject and Class Assignment for Teachers**
Each Teacher shall be assigned to one or more subjects within one or more class arms for the current academic term. Subject assignments determine which gradebook columns the Teacher can see and edit. A Teacher with no subject assignments for a term cannot access the gradebook or enter grades for that term. Subject assignments shall be created or updated by the Principal or Admin Officer at the start of each term as part of term setup. Changes to subject assignments after the term opens shall be audit-logged and shall require Principal approval. When a subject assignment is removed mid-term, the Teacher's existing grade entries for that subject in that term are preserved but they lose write access going forward. The Exam Officer retains read access to all subject entries regardless of current assignment.

**FR-HRM-004: Class Teacher Assignment**
Each class arm may have exactly one active Class Teacher per academic term. The Principal or Admin Officer shall assign a Teacher to a class arm by activating the Class Teacher extension on their account and specifying the class arm and term. A Teacher can be the Class Teacher for only one class arm per term. If a Class Teacher is reassigned mid-term, the previous Class Teacher loses the Class Teacher extension for that class arm and their attendance access is revoked. All attendance records they previously marked are retained and attributed to them. The new Class Teacher gains the extension and can continue attendance marking from that point forward.

**FR-HRM-005: Deputy and Backup Role Assignments**
The Principal shall be able to designate a Deputy Exam Officer for each Exam Officer account. The Principal shall also be able to designate a backup Accountant and a backup Cashier for operational continuity. Deputy and backup designations are stored against the primary role holder's staff profile. Auto-activation rules for deputies — such as the seventy-two-hour inactivity trigger for the Deputy Exam Officer defined in FR-ACA-008 — apply based on these designations.

**FR-HRM-006: Staff Deactivation**
The Principal or School Owner shall be able to deactivate a staff account. Deactivation is a soft deletion — the staff profile, all historical assignments, all attendance records marked, all grade entries made, and all workflow actions taken by the staff member are permanently preserved. Deactivation shall immediately revoke all active sessions for the deactivated user. Deactivated accounts cannot log in. If the deactivated staff member held a critical singleton role — such as Exam Officer, Accountant, or Class Teacher for a class with students — the system shall warn the Principal before confirming deactivation and require confirmation that a replacement or deputy is assigned. A deactivated staff member can be reactivated by the Principal or School Owner, which restores their account but does not automatically restore previous role assignments or subject assignments. All reactivations are audit-logged.

**FR-HRM-007: Staff Directory and Profile View**
The Principal and Admin Officer shall have access to a staff directory listing all active, pending, and deactivated staff members for the tenant. Each staff profile shall display the staff member's name, current role and extensions, current subject and class assignments, account status, date of joining, and date of deactivation where applicable. The Principal may view the full assignment history and audit trail for any staff member. Staff members may view and update their own contact details — phone number and notification preferences — but cannot change their own email address or role without approval.

**FR-HRM-008: Staff Access Revocation on Account Events**
The following account events shall immediately and automatically revoke all active sessions for the affected user: password change by the user, password reset triggered by OTP, role change, deactivation, and MFA device reset. The system shall maintain a token blacklist or version counter per user so that tokens issued before these events are rejected at the API layer even if they have not yet expired by their configured expiry time. This ensures that a deactivated or role-changed staff member cannot continue using an existing valid token after the event.

---

## 5. Mobile Application Requirements

Loomis shall provide a native mobile application for iOS 15 and above and Android 10 and above for four primary actor groups: Parents, Students, Class Teachers, and Teachers. The mobile app is designed as the primary interface for time-sensitive, on-the-go interactions. All mobile access is subject to the same authentication, tenant isolation, and RBAC or ABAC rules as the web application.

### 5.1 Parent Mobile App (Full Feature Parity with Web)

| Feature | Description |
|---------|-------------|
| Multi-Child Dashboard | Home screen showing all linked children with at-a-glance status: attendance, latest result, outstanding fees, and unread messages per child |
| Academic Tracking | View published results per subject per term, component score breakdown aligned to the grading scheme, and attendance records per child |
| Financial Hub | View fee schedules, payment history, and outstanding balances. Initiate fee payments via integrated payment gateway directly from the app. |
| Communication Hub | Unified inbox aggregating messages from all linked schools. Reply to Class Teacher messages and view school-wide announcements. |
| Push Notifications | Real-time push notifications for result publication, attendance alerts, fee reminders, new messages, and assignment reminders |
| Profile Management | Manage account details, linked children, and notification preferences |
| Report Card Download | Download and share published report cards as PDF from the app |
| Biometric Login | Support for Face ID and fingerprint authentication for quick access after initial login with password and MFA |

### 5.2 Student Mobile App (Full Feature Parity with Web)

| Feature | Description |
|---------|-------------|
| Student Dashboard | Home screen with timetable for the day, upcoming assignment deadlines, attendance summary, and latest results |
| Timetable | Weekly view with subject, teacher, and venue per period |
| Assignments | View all active assignments with due dates and submission status. Submit assignments digitally from the app. |
| Results and Report Cards | View published results per subject with component score breakdown. Download report card as PDF. |
| Attendance Summary | View personal attendance history with status breakdown per subject or period |
| Learning Materials | Access and download learning materials uploaded by Teachers, organised by subject and term |
| Notifications | Push notifications for new assignments, submission deadlines, published results, attendance alerts, and school announcements |
| Biometric Login | Support for Face ID and fingerprint authentication |

### 5.3 Class Teacher Mobile App

The Class Teacher mobile app focuses on the most time-critical Class Teacher responsibilities. Not all web features are required on mobile, but the following are essential.

| Feature | Offline Capable |
|---------|-----------------|
| Attendance Marking | Yes — offline queue with tamper-evident signing per tenant and device; syncs automatically on reconnect |
| Attendance Reports | Read-only with cached data |
| Class Overview Dashboard | Read-only with cached data |
| Student Welfare Flags | View only; no offline editing |
| Read-Only Class Gradebook | No |
| Gradebook Completion Status | No |
| Parent Messaging | No |
| Push Notifications | Not applicable |
| Timetable View | Read-only with cached data |

### 5.4 Teacher Mobile App

The Teacher mobile app focuses on gradebook management and assignment oversight.

| Feature | Offline Capable |
|---------|-----------------|
| Subject Gradebook — Score Entry | Yes — offline draft mode with tamper-evident signing; syncs on reconnect |
| Gradebook Completion Status | Read-only with cached data |
| Assignment Management | No |
| Assignment Grading | No |
| Learning Materials Upload | No |
| Results Preview | No |
| Push Notifications | Not applicable |
| Timetable View | Read-only with cached data |

### 5.5 Mobile App — Cross-Cutting Requirements

| ID | Requirement |
|----|-------------|
| MOB-001 | The mobile app shall support iOS 15 and above and Android 10 and above. |
| MOB-002 | All mobile sessions shall use the same JWT authentication tokens as the web application with configurable expiry. |
| MOB-003 | Biometric authentication — Face ID and fingerprint — shall be supported as a secondary method after the initial login with password and MFA. |
| MOB-004 | Push notifications shall be delivered via Firebase Cloud Messaging for Android and Apple Push Notification Service for iOS. |
| MOB-005 | Offline-capable features shall queue actions locally and synchronise automatically upon reconnection. |
| MOB-006 | The app shall display a clear sync status indicator to the user when operating in offline mode. |
| MOB-007 | Offline queue entries for attendance and gradebook actions shall be signed with a per-tenant device key. The server shall reject any entry where the origin tenant does not match the authenticated tenant at sync time. |
| MOB-008 | The mobile app codebase shall share business logic with the web layer via a shared API. No data logic shall be duplicated in the mobile client. |
| MOB-009 | All tenant isolation and role-based access control rules enforced on the web shall be equally enforced on all mobile API calls via server-side validation. |
| MOB-010 | The app shall support dark mode on both platforms. |
| MOB-011 | App store distribution shall target both the Apple App Store and Google Play Store under the Loomis brand. |
| MOB-012 | Offline data stored on-device for attendance and gradebook drafts shall be encrypted at rest using the device's native keystore or keychain. |
| MOB-013 | Offline data that has not been synchronised within seven days shall prompt the user to resolve the queue before the next session begins. |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-001 | Dashboard load time (web) | Less than 2 seconds at the 95th percentile |
| NFR-PERF-002 | API response time for data queries | Less than 500 milliseconds under normal load |
| NFR-PERF-003 | Report generation (PDF) | Less than 10 seconds for up to 500 records |
| NFR-PERF-004 | Mobile app cold start | Less than 3 seconds |
| NFR-PERF-005 | Concurrent users per tenant | 500 simultaneous or more |
| NFR-PERF-006 | Platform-wide concurrent users | 50,000 simultaneous or more |
| NFR-PERF-007 | Offline attendance sync on reconnect | Less than 5 seconds for up to 200 queued records |
| NFR-PERF-008 | IVP daily snapshot computation | Completed within the nightly batch window |
| NFR-PERF-009 | PSF obligation creation at census lock | Less than 30 seconds for up to 5,000 students per tenant |

### 6.2 Scalability

The system shall support horizontal scaling to accommodate tenant growth without requiring architectural changes. The platform shall support the addition of new regions and referral hierarchies without downtime. The PSF billing engine and IVP snapshot engine shall process concurrent operations across thousands of tenants without performance degradation.

### 6.3 Availability and Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVL-001 | Platform uptime SLA | 99.9 percent or above |
| NFR-AVL-002 | Scheduled maintenance window | Non-peak hours with a minimum of 48 hours notice |
| NFR-AVL-003 | Recovery Point Objective (RPO) | One hour or less |
| NFR-AVL-004 | Recovery Time Objective (RTO) | Four hours or less |
| NFR-AVL-005 | Daily automated backups | Retained for a minimum of 30 days per tenant |
| NFR-AVL-006 | Financial event queue failure | Failed financial events shall alert Revenue Operations within 5 minutes; the affected tenant's term closure shall be blocked until resolved |
| NFR-AVL-007 | Payment gateway redundancy | Minimum three gateway integrations active simultaneously; automatic failover within 30 seconds |

### 6.4 Security

All data in transit shall use TLS 1.2 or higher. All data at rest shall use AES-256 or equivalent. Passwords shall be stored using bcrypt or Argon2 and never stored in plaintext. PII fields shall be masked in logs and in non-essential API responses. Tenant data isolation shall be enforced at the database Row-Level Security layer and the application query layer simultaneously. Session tokens shall use JWT with configurable expiry defaulting to eight hours active and thirty days for refresh tokens. Mobile tokens shall use the same scheme. More than five failed login attempts within ten minutes shall trigger account lockout with email notification. Multi-factor authentication shall be mandatory for all Platform Layer, Regional Layer, and privileged School Layer accounts as specified in Section 9.

### 6.5 Usability

The grading scheme builder shall provide real-time weight validation with a live running total that turns red when the sum does not equal one hundred percent. As new components are added, the system shall auto-suggest the remaining available percentage. Role-specific dashboards shall surface only the actions and data relevant to the user's role. Critical mobile flows such as attendance marking and gradebook entry shall require no more than three taps from the home screen. The census lock flow shall auto-populate the declared student count from current active term enrollment records, requiring the School Owner or Principal only to confirm or adjust with a documented reason.

### 6.6 Data Privacy and Compliance

Student data shall be treated as sensitive personal information protected under the Nigeria Data Protection Act 2023 and all applicable data protection regulations. Cross-tenant data access shall be architecturally prevented through Row-Level Security and the tenant-scoped fan-out query pattern. Parental consent mechanisms shall be included for the processing of children's data, with consent versioned against the applicable privacy policy version. The platform shall maintain a DSAR workflow with a thirty-day fulfillment deadline. Breach notification workflows shall be automatically triggered for critical and high severity events, tracking the NDPC notification deadline of seventy-two hours. Retention schedules shall be implemented so that personal data is deleted or anonymised when retention periods expire.

### 6.7 Financial Integrity

All financial state transitions shall be driven by events and shall not be applied through direct record updates. Every financial write shall use the outbox pattern, meaning the state change and the event publication are committed in the same database transaction to prevent message loss. The platform ledger shall maintain balanced double-entry accounting — every ledger transaction must net to zero per currency, and a nightly balance check shall verify this. If the audit store is unavailable, financial and privileged writes shall fail closed — the operation is rejected rather than proceeding without an audit record.

---

## 7. System Constraints and Assumptions

### 7.1 Constraints

| ID | Constraint |
|----|------------|
| CON-001 | Each school (tenant) must be fully isolated at the data layer via Row-Level Security. No cross-tenant data exposure is permissible. |
| CON-002 | Parent identity resolution across tenants must never expose data from one school to another. |
| CON-003 | Attendance marking is exclusively a Class Teacher capability. |
| CON-004 | Grade entry is exclusively a Teacher capability. Class Teachers have read-only access. |
| CON-005 | Grading scheme weights must sum to exactly one hundred percent. The system shall enforce this at save time. |
| CON-006 | PSF obligations are created by census lock, not by any payment event. |
| CON-007 | Audit logs must be immutable, retained for a minimum of five years, and protected by tamper-evident chaining. |
| CON-008 | All financial records are immutable once confirmed. Corrections use adjustment transactions, not record edits. |
| CON-009 | Referral codes are permanently attached to school records at onboarding and cannot be changed retroactively. |
| CON-010 | Mobile apps enforce the same access rules as the web application via server-side API enforcement. |
| CON-011 | A PSF rate of zero is permanently blocked in the system and cannot be configured through any approval process. |
| CON-012 | All financial write APIs must accept and enforce an Idempotency Key. |
| CON-013 | All privileged platform actions require two-person approval. The requester cannot approve their own request. |
| CON-014 | The cashier who logs an offline payment shall not verify that same payment. |
| CON-015 | Referral participants cannot earn referral income until both KYC and conflict-of-interest declaration are approved. |
| CON-016 | Total referral payouts from any single tenant per payout period shall not exceed forty percent of PSF collected from that tenant. |
| CON-017 | Only one academic year per tenant may be in an active state at any given time. |
| CON-018 | Only one term per academic year may be in an open state at any given time. |
| CON-019 | A term cannot be opened if the previous term in the same academic year is not closed. |
| CON-020 | An academic year cannot be activated if the previous academic year has any unclosed terms. |
| CON-021 | Term closure is blocked by unsettled PSF obligations and unverified offline payments. These financial blockers cannot be overridden at the school level and require platform approval. |
| CON-022 | A graduated student shall not be enrolled in any future term unless re-admitted through the standard admissions pipeline. |
| CON-023 | A staff invitation link shall expire after forty-eight hours. Expired invitations must be re-issued by the Principal or Admin Officer. |
| CON-024 | A Teacher with no subject assignments for the current term shall have read-only access to the gradebook module and zero write access for that term. |
| CON-025 | A Class Teacher extension on a Teacher account is term-specific. Assigning the extension for one term does not carry it over to the next term automatically; it must be explicitly assigned each term. |
| CON-026 | Only one active Class Teacher is permitted per class arm per term. Assigning a new Class Teacher to a class arm mid-term automatically removes the Class Teacher extension from the previous holder. |
| CON-027 | Deactivating a staff member who is the sole Exam Officer or sole Accountant for the tenant shall require the Principal to either confirm a deputy is available or assign a replacement before the deactivation is finalised. |
| CON-028 | A maximum of five concurrent active sessions are permitted per user account across all devices. Exceeding this limit displaces the oldest session. |

### 7.2 Assumptions

| ID | Assumption |
|----|------------|
| ASM-001 | Schools have internet connectivity sufficient for web application use. |
| ASM-002 | Each school designates at least one School Owner and one Principal at onboarding. |
| ASM-003 | Parent email addresses are unique system-wide and serve as the primary cross-tenant identity key. |
| ASM-004 | Regional Managers and Subordinates are created by Platform Administrators or Regional Managers, subject to KYC approval. |
| ASM-005 | The platform integrates with at least three payment gateways simultaneously per deployment region. |
| ASM-006 | Schools configure their own grading schemes, fee structures, academic calendar, and workflows during setup. |
| ASM-007 | Academic terms and grading schemes are defined per tenant and not inherited from the platform. |
| ASM-008 | A Class Teacher is always also a Teacher and holds both roles simultaneously. |
| ASM-009 | The mobile app is the primary interface for parents. Web access is secondary. |
| ASM-010 | Offline data stored on-device shall not be retained longer than seven days unsynced. |
| ASM-011 | The Terms of Service incorporate a PSF True-Up Clause and Minimum Term Commitment reviewed and approved by legal counsel. |
| ASM-012 | A Data Protection Officer role is designated prior to platform launch. |
| ASM-013 | Between forty and seventy percent of Nigerian private school fee payments are offline. The platform is designed to operate correctly in this environment without revenue leakage. |

---

## 8. Data Model Overview

### 8.1 Core Entities

| Entity | Tenant Scope | Key Attributes |
|--------|-------------|----------------|
| Platform Config | Global | Default PSF rate, referral tiers, PSF floor rate, feature flags |
| Region | Global | Region identifier, name, assigned manager |
| Tenant (School) | Global root | Tenant identifier, school name, region, referral code at onboarding, PSF rate override, status |
| Academic Year | Tenant | Year identifier, label (e.g. "2026/2027"), start month, end month, number of terms, status (draft, active, closed, archived) |
| Academic Term | Tenant | Term identifier, academic year reference, term name or number, start date, end date, enrollment window open and close dates, census lock date, exam period dates, status (draft, open, census locked, closed) |
| Class Level | Tenant | Level identifier, level name (e.g. JSS1, SS2, Primary 4), school section, sort order, terminal flag |
| Class Arm | Tenant | Arm identifier, class level, arm name (e.g. A, B, Gold), academic year, assigned class teacher, student capacity |
| Class Progression Map | Tenant | Mapping identifier, source class level, destination class level, is terminal (graduation trigger) |
| Student Promotion Record | Tenant | Record identifier, academic year, student, source class arm, destination class arm, held back flag, held back reason, confirmed by, confirmed at |
| Student | Tenant | Student identifier, admission number, full name, date of birth, enrollment status, identity attestation status |
| Term Enrollment | Tenant | Enrollment identifier, term, student, class, billable status, billable reason, census source |
| Enrollment Attestation | Tenant | Attestation identifier, term, attested count, attested by (Principal or School Owner), timestamp, status |
| Student Activity Evidence | Tenant | Evidence identifier, term, student, evidence type, reference, timestamp |
| PSF Rate Snapshot | Global | Snapshot identifier, scope (global or tenant), rate amount, effective term, decision record reference |
| PSF Obligation | Tenant | Obligation identifier, term, student, rate snapshot, obligation amount, settled amount, status |
| PSF Settlement | Tenant | Settlement identifier, obligation, payment reference, settlement amount, source, status |
| Payment | Tenant | Payment identifier, term, student, channel, amount, status, idempotency key, logged by, verified by |
| Offline Payment Evidence | Tenant | Evidence identifier, payment, evidence type, evidence hash, submitted by |
| Payment Webhook Event | Global | Event identifier, provider, gateway event ID, signature validity, status |
| Refund | Tenant | Refund identifier, payment, amount, reason, PSF treatment, status, workflow reference |
| Platform Ledger Entry | Global | Entry identifier, transaction group, account code, direction (debit or credit), amount, source type, source reference |
| IVP Signal Snapshot | Global | Snapshot identifier, tenant, date, signal type, signal value |
| IVP Anomaly Case | Global | Case identifier, tenant, term, anomaly score, reported enrollment, estimated enrollment range, status |
| Referral Participant | Global | Participant identifier, user, participant type, manager reference, KYC status, conflict declaration status, active status |
| Referral Code | Global | Code identifier, participant, code hash (cryptographic only), entropy level, status |
| School Referral Attribution | Global | Attribution identifier, tenant, referral code, attributed participant, attribution status, effective dates |
| Referral Earning Entry | Global | Earning identifier, PSF obligation, participant, earning amount, rate, status, payout cycle |
| Parent Identity | Global | Identity identifier, normalised email, phone number, verification status |
| Parent-Student Link | Cross-tenant | Link identifier, parent identity, tenant, student, relationship, verification status, verification factor |
| Privileged Change Request | Global | Request identifier, change type, target tenant, before state, after state, reason, risk score, status |
| Audit Event | Global | Event identifier, tenant, actor, action, resource, sensitivity, result, IP address, before and after hashes |
| Data Access Event | Global | Event identifier, actor, access reason, resource type, record count, child PII flag, financial data flag |
| Storage Object | Tenant | Object identifier, tenant, owning resource, bucket, opaque object key, classification |
| User — Platform | Global | User identifier, email, role |
| User — School | Tenant-bound | User identifier, tenant, email, role, class teacher flag, assigned class |
| User — Parent | Cross-tenant | User identifier, email, linked student identifiers |
| Class | Tenant | Class identifier, name, level, assigned class teacher, academic year |
| Grading Scheme | Tenant | Scheme identifier, class level, term, academic year, component definitions with weights, published status |
| Timetable | Tenant | Timetable identifier, class, term, schedule entries |
| Attendance Record | Tenant | Record identifier, student, class, date, status, marked by, synced timestamp |
| Assignment | Tenant | Assignment identifier, class, teacher, subject, title, due date |
| Submission | Tenant | Submission identifier, assignment, student, submitted timestamp, late flag, grade |
| Gradebook Entry | Tenant | Entry identifier, student, class, subject, teacher, scheme, component scores, weighted total, locked status |
| Grade Correction Log | Tenant | Log identifier, gradebook entry, original scores, corrected scores, requester, approver chain, status |
| Exam Config | Tenant | Exam identifier, term, academic year, scheme reference |
| Result | Tenant | Result identifier, student, exam, subject totals, overall average, published status |
| Fee Structure | Tenant | Fee identifier, class, term, fee items with amounts, academic year |
| Receipt | Tenant | Receipt identifier, payment, issued timestamp, line items |
| Workflow Instance | Tenant | Workflow identifier, type, current step, steps with approvers, status |
| Message | Cross-tenant | Message identifier, sender, recipients, tenant, content, sent timestamp |
| Notification | Cross-tenant | Notification identifier, user, tenant, type, content, read status, channel, sent timestamp |
| Staff Profile | Tenant | Profile identifier, tenant, user identifier, full name, phone number, personal email, employment status (active, pending, deactivated), date created, date deactivated |
| Staff Role Assignment | Tenant | Assignment identifier, staff profile, primary role, role extensions, assigned by, effective date, end date, approval reference |
| Subject Assignment | Tenant | Assignment identifier, tenant, staff profile, subject, class arm, term, academic year, assigned by, effective date, revoked flag |
| Class Teacher Assignment | Tenant | Assignment identifier, tenant, staff profile, class arm, term, academic year, assigned by, effective date, revoked flag |
| Staff Invitation | Tenant | Invitation identifier, tenant, invitee email, role to assign, created by, expiry timestamp, accepted status |
| User Session | Global | Session identifier, user identifier, device fingerprint, issued at, last active, absolute expiry, idle expiry, revoked flag, revocation reason |
| Registered Device | Global | Device identifier, user identifier, device fingerprint, registered at, last seen, persistent token hash, revoked flag |

### 8.2 Grading Scheme — Data Structure Example

| Component Name | Weight (%) | Entered By | Weighted Contribution |
|----------------|-----------|------------|-----------------------|
| Weekly Mini Tests | 10 | Teacher | 10% of 100 |
| Assignments | 10 | Teacher | 10% of 100 |
| Mid-Term Test | 20 | Teacher | 20% of 100 |
| Terminal Examination | 60 | Teacher | 60% of 100 |
| **TOTAL** | **100** | — | **100** |

### 8.3 Multi-Tenancy and Referral Data Isolation

Every tenant-bound table includes a mandatory tenant identifier enforced at the database Row-Level Security layer and the application query layer. The payment record stores a snapshot of the PSF rate at the time the obligation was created — rate changes do not alter historical obligations. Referral earnings are computed in a separate global ledger and schools cannot see referral attribution details. Parent identity operates as a global entity; parent-student link records reference tenant-specific student identifiers without exposing sibling school data. Parent dashboard queries perform a separate tenant-scoped database round-trip per linked child — no cross-tenant joins.

### 8.4 PSF Obligation Status Progression

A PSF obligation moves through the following statuses: pending upon creation at census lock; partially settled when some but not all payment has been received; settled when the full obligation amount has been received; waived when dual-approved by Platform Operations with a documented reason; disputed when a platform investigation is open; and written off when the debt is deemed uncollectible, which itself requires a dual-approved audit record. A refund does not change the PSF obligation status. PSF reversal on refund requires a separate platform approval process.

---

## 9. Security Requirements

### 9.1 Authentication

| ID | Requirement |
|----|-------------|
| SEC-AUTH-001 | All users shall authenticate via email and password with a minimum of eight characters and complexity requirements. |
| SEC-AUTH-002 | MFA using a time-based one-time password authenticator app shall be mandatory for Platform Owners, Platform Administrators, the Data Protection Officer, Regional Managers, Regional Subordinates, School Owners, Principals, Accountants, Admin Officers, Exam Officers, and all users with export capabilities. |
| SEC-AUTH-003 | For all roles where MFA is mandatory, the account shall be locked until MFA is configured on first login. |
| SEC-AUTH-004 | Biometric authentication — Face ID and fingerprint — shall be supported on mobile as a secondary method after the initial login with password and MFA. |
| SEC-AUTH-005 | Session tokens shall use JWT with configurable expiry, defaulting to eight hours active and thirty days for the refresh token. Mobile tokens shall use the same scheme. |
| SEC-AUTH-006 | More than five failed login attempts within ten minutes shall trigger account lockout with an email notification to the registered address. |
| SEC-AUTH-007 | Password reset shall require OTP verification via the registered email or phone number. |
| SEC-AUTH-008 | Step-up MFA shall be required for the following high-risk actions regardless of session age: refund initiation or approval, data export, PSF rate changes, PSF obligation waivers, ledger adjustments, result publishing, parent identity email or phone changes, and privileged support access. |
| SEC-AUTH-009 | Parent account email address or phone number changes shall require MFA verification and a cooling-off period before taking effect. |
| SEC-AUTH-010 | Each user account shall be limited to a maximum of five concurrent active sessions across all devices and clients. Attempting to open a sixth session shall invalidate the oldest session and issue the new session token. The user shall be notified when a prior session is displaced. |
| SEC-AUTH-011 | Session tokens shall distinguish between idle timeout and absolute timeout. An idle timeout of thirty minutes shall apply to all browser-based sessions — a token unused for thirty minutes shall be invalidated. An absolute timeout of eight hours shall apply regardless of activity. Refresh tokens shall have an absolute lifetime of thirty days. Refreshing a token resets the idle clock but does not extend the absolute session lifetime. Mobile tokens shall follow the same idle and absolute timeout rules, with the idle timeout extended to sixty minutes to accommodate on-the-go use patterns. |
| SEC-AUTH-012 | A password change — whether initiated by the user or via OTP reset — shall immediately invalidate all existing sessions for that user on all devices except the one on which the password was changed. The current-device session shall be re-issued with a fresh token reflecting the new credential. |
| SEC-AUTH-013 | A role change, role extension addition or removal, or account deactivation shall immediately invalidate all existing sessions for the affected user on all devices with no exception, forcing a fresh login under the new permissions. |
| SEC-AUTH-014 | For all roles where MFA is mandatory, the platform shall maintain a registered-device registry per user. A device is registered when MFA is successfully completed from it for the first time. Registered devices may be eligible for reduced MFA friction on subsequent logins using a persistent device token valid for thirty days. Explicit logout from a device shall remove that device's persistent token. Deregistering a device — via the user's security settings — shall immediately invalidate that device's persistent token and force full MFA on the next login from that device. Changing MFA device or resetting MFA shall deregister all registered devices and invalidate all persistent device tokens. |
| SEC-AUTH-015 | MFA device reset or removal shall immediately invalidate all active sessions for the affected user on all devices and force re-enrollment of MFA before any further access is permitted. |

### 9.2 Authorisation

| ID | Requirement |
|----|-------------|
| SEC-AZ-001 | RBAC shall govern all tenant-bound user access. |
| SEC-AZ-002 | Cross-tenant access for Parents, Regional Managers, and Subordinates shall be governed by ABAC using relationship mappings and the referral hierarchy. |
| SEC-AZ-003 | Every API endpoint — on both web and mobile — shall validate the authenticated user's role and tenant scope before executing any operation. |
| SEC-AZ-004 | Regional layer actors shall be technically prevented from performing any write operations on school data. |
| SEC-AZ-005 | Class Teachers shall be technically prevented from writing to gradebook entries owned by other teachers. |
| SEC-AZ-006 | Teachers shall be technically prevented from accessing any attendance-marking endpoints. |
| SEC-AZ-007 | Privilege escalation — including role changes and account activations — shall require higher-authority approval and shall be permanently audit-logged. |
| SEC-AZ-008 | The cashier who logged an offline payment shall be technically prevented from accessing the verification endpoint for that same payment. |
| SEC-AZ-009 | A Regional Manager shall be technically prevented from approving the KYC verification of their own subordinates. |

### 9.3 Data Security

| ID | Requirement |
|----|-------------|
| SEC-DAT-001 | All data in transit shall use TLS 1.2 or higher. |
| SEC-DAT-002 | All data at rest shall use AES-256 or equivalent. |
| SEC-DAT-003 | Passwords shall be stored using bcrypt or Argon2 with appropriate salt. Plaintext password storage is prohibited. |
| SEC-DAT-004 | PII fields shall be masked in logs and in non-essential API responses. |
| SEC-DAT-005 | Tenant data isolation shall be enforced at the database Row-Level Security layer using mandatory tenant identifier scoping on all tenant-bound tables. |
| SEC-DAT-006 | Offline data stored on mobile devices for attendance and gradebook drafts shall be encrypted at rest using the device's native keystore or keychain. |
| SEC-DAT-007 | Referral codes shall be stored only as cryptographic hashes. Raw codes shall be displayed exactly once at generation time and never stored by the platform. |
| SEC-DAT-008 | Object storage buckets shall be configured with a private access policy denying all direct public access. Object keys shall be opaque and non-predictable. Access shall be provided only through signed URLs that expire within five minutes and are generated after a tenant authorization check. |
| SEC-DAT-009 | Offline mobile queue entries shall be signed with a per-tenant device key. The server shall reject any sync entry where the declared origin tenant does not match the authenticated tenant context. |

### 9.4 Break-Glass and Privileged Support Access

| ID | Requirement |
|----|-------------|
| SEC-BG-001 | Platform Administrator access to a tenant's operational data for support purposes shall require activation of a break-glass session, which in turn requires a valid support ticket identifier. |
| SEC-BG-002 | Break-glass activation shall log the reason, the support ticket reference, the tenant in scope, the start time, and the activating user before any data access occurs. |
| SEC-BG-003 | The School Owner of the affected tenant shall be notified within five minutes of break-glass activation unless the access is part of a legally restricted investigation. |
| SEC-BG-004 | Break-glass sessions shall automatically expire after thirty minutes. |
| SEC-BG-005 | All individual actions performed during a break-glass session shall be logged separately in the audit log with the actor type identified as platform support access. |

### 9.5 Webhook Security

| ID | Requirement |
|----|-------------|
| SEC-WH-001 | All payment gateway webhooks shall be cryptographically verified using the provider's HMAC signature or public key before any processing occurs. |
| SEC-WH-002 | Every received webhook event shall be stored in the webhook event log using idempotent insertion before any business logic executes. |
| SEC-WH-003 | Duplicate webhook events — identified by matching provider and event identifier — shall be detected and returned a duplicate acknowledgement response with no business logic executed. |
| SEC-WH-004 | Webhook events with timestamps outside a five-minute tolerance window shall be rejected unless the event was retrieved via a provider reconciliation API. |

### 9.6 Pre-Launch and Ongoing Security

| ID | Requirement |
|----|-------------|
| SEC-PL-001 | The platform shall complete a third-party penetration test before launch. Findings of critical or high severity shall be remediated before go-live. |
| SEC-PL-002 | An annual third-party security assessment shall be conducted. |
| SEC-PL-003 | A vulnerability disclosure policy and responsible disclosure contact shall be published on the platform website before launch. |

---

## 10. Integration Requirements

### 10.1 Payment Gateway Integration

The platform shall integrate with a minimum of three payment gateways simultaneously per deployment region — for example Paystack, Flutterwave, and Monnify or Remita. Webhook handling shall be in place for real-time payment confirmation, with all webhooks cryptographically verified before processing. PSF settlement shall be supported as a split payment or a post-settlement transfer to the Loomis platform account. Provider reconciliation jobs shall run daily to compare gateway settlement records against internal payment records. Automatic failover to a secondary gateway shall occur within thirty seconds of a primary gateway failure.

### 10.2 Bank Statement Reconciliation

The platform shall support bank statement upload with automated document analysis to match offline bank transfer payments to platform payment records. Where automatic matching is unavailable, unmatched items shall require dual manual verification by an Accountant and a secondary approver. The system shall flag anomalous patterns in uploaded documents for manual review.

### 10.3 Email and SMS Services

Email service provider integration shall be in place for transactional emails and notification delivery. An SMS gateway shall be integrated for OTP delivery and critical alerts. Notification templates shall be configurable per school with the school's own branding.

### 10.4 Push Notifications

Firebase Cloud Messaging shall be used for Android push notifications. Apple Push Notification Service shall be used for iOS push notifications. Topic-based push subscription shall be maintained per user role and per school.

### 10.5 File Storage

Cloud object storage shall be used for profile photos, assignment attachments, learning materials, and document uploads. All storage buckets shall be configured as private. Object keys shall be opaque and non-predictable. Access shall be provided only through signed URLs that expire within five minutes, generated after a tenant authorization check. Files shall be scanned for malware on upload and classified by data sensitivity type.

### 10.6 Analytics and Reporting

Regional and platform-level analytics shall be powered by a dedicated analytics layer or data warehouse fed by event streams from the platform. Report exports in PDF and CSV formats shall be generated server-side and delivered via secure download links. IVP snapshot data shall feed into the analytics layer to enable enrollment trend visualisation and anomaly reporting.

---

## 11. Appendices

### Appendix A: Role-Permission Matrix

| Feature Area | Platform Owner | Platform Admin | DPO | Regional Mgr | Subordinate | School Owner | Principal | Admin Officer | Accountant | Cashier | Exam Officer | Deputy Exam Officer | Teacher | Class Teacher | Parent | Student |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Tenant Onboarding | Full | Full | None | Full | Full | None | None | None | None | None | None | None | None | None | None | None |
| Staff Onboarding — Create Account | None | None | None | None | None | Full | Full | Full | None | None | None | None | None | None | None | None |
| Staff Role Assignment and Change | None | None | None | None | None | Full | Full | None | None | None | None | None | None | None | None | None |
| Subject and Class Assignment | None | None | None | None | None | View | Full | Full | None | None | None | None | None | None | None | None |
| Class Teacher Assignment | None | None | None | None | None | View | Full | Full | None | None | None | None | None | None | None | None |
| Staff Deactivation | None | None | None | None | None | Full | Full | None | None | None | None | None | None | None | None | None |
| Staff Directory View | None | None | None | None | None | View | Full | Full | None | None | None | None | None | None | None | None |
| Staff Profile — Self Update | None | None | None | None | None | None | None | None | None | None | None | None | Own | Own | None | None |
| Session Management — View Active Sessions | None | None | None | None | None | Own | Own | Own | Own | Own | Own | Own | Own | Own | Own | Own |
| Session Management — Revoke Session | None | None | None | None | None | Own | Own | Own | Own | Own | Own | Own | Own | Own | Own | Own |
| Device Registry — View and Deregister | None | None | None | None | None | Own | Own | Own | Own | Own | Own | Own | Own | Own | Own | Own |
| Academic Year — Create and Activate | None | None | None | None | None | Full | Full | None | None | None | None | None | None | None | None | None |
| Academic Year — Close | None | None | None | None | None | Full | Full | None | None | None | None | None | None | None | None | None |
| Term — Configure and Open | None | None | None | None | None | Full | Full | View | None | None | None | None | None | None | None | None |
| Term — Close | None | None | None | None | None | Full | Full | None | None | None | None | None | None | None | None | None |
| Student Promotion | None | None | None | None | None | Full | Full | Full | None | None | None | None | None | None | None | None |
| Student Graduation | None | None | None | None | None | Full | Full | Full | None | None | Full | None | None | None | None | None |
| Academic Calendar | None | None | None | None | None | Full | Full | View | None | None | None | None | View | View | View | View |
| PSF Rate Config | Full | Dual-approval | None | None | None | View | View | None | View | None | None | None | None | None | None | None |
| Referral Mgmt | Full | Full | None | Own network | Own | None | None | None | None | None | None | None | None | None | None | None |
| IVP and Revenue Risk | Full | Full | None | None | None | View | None | None | None | None | None | None | None | None | None | None |
| Regional Analytics | Full | Full | None | Aggregated read | Partial | None | None | None | None | None | None | None | None | None | None | None |
| Privileged Changes | Approve | Request | None | None | None | None | None | None | None | None | None | None | None | None | None | None |
| Break-Glass Access | None | Ticket-bound | None | None | None | None | None | None | None | None | None | None | None | None | None | None |
| Admissions | None | None | None | None | None | View | Approve | Full | None | None | None | None | None | None | None | None |
| Student Records | None | None | None | None | None | View | View | Full | View | None | View | None | Class | Class | Own children | Own |
| Census Lock | None | None | None | None | None | Full + MFA | Full + MFA | None | None | None | None | None | None | None | None | None |
| Attendance Mark | None | None | None | None | None | None | None | None | None | None | None | None | None | Full | None | None |
| Attendance View | None | None | None | None | None | View | View | View | None | None | None | None | None | Full | View children | Own |
| Grading Scheme | None | None | None | None | None | View | View | None | None | None | Configure | Configure | None | None | None | None |
| Gradebook Entry | None | None | None | None | None | None | None | None | None | None | None | None | Own subjects | None | None | None |
| Gradebook View | None | None | None | None | None | None | None | None | None | None | Full | Full | Own subjects | Read-only all | Own children | Own |
| Results and Exams | None | None | None | None | None | View | View | View | None | None | Full | Full on activation | Input | View | Own children | Own |
| Fee Configuration | None | None | None | None | None | View | View | None | Full | None | None | None | None | None | None | None |
| Payment Logging | None | None | None | None | None | View | View | None | Full | Log only | None | None | None | None | None | None |
| Payment Verification | None | None | None | None | None | None | None | None | Full | Cannot verify own | None | None | None | None | None | None |
| PSF Ledger | Full | View | None | None | None | View | None | None | View | None | None | None | None | None | None | None |
| Refunds | Full | Approve | None | None | None | Approve | Approve | None | Approve | Initiate | None | None | None | None | None | None |
| Messaging | None | None | None | None | None | Broadcast | Broadcast | Broadcast | None | None | None | None | None | Class | Receive and reply | Receive |
| DSAR and Compliance | Full | None | Full | None | None | None | None | None | None | None | None | None | None | None | None | None |
| Audit Logs | Full | Full | Full | None | None | Tenant scope | Tenant scope | None | None | None | None | None | None | None | None | None |
| Workflows | Configure | Configure | None | None | None | Approve | Approve | Initiate | Approve | Initiate | None | None | None | None | None | None |
| Mobile App | None | None | None | None | None | None | None | None | None | None | None | None | Full | Full | Full | Full |

### Appendix B: Grading Scheme Builder — UX Rules

| Rule | Behaviour |
|------|-----------|
| Live weight total | A running total is displayed as components are added. Turns red if total is not one hundred percent. |
| Auto-remaining calculation | When adding a new component, the system suggests the remaining available percentage. |
| Save validation | The system prevents saving or publishing a scheme where weights do not sum to exactly one hundred percent. |
| Template library | Pre-built templates such as 40 CA / 60 Exam and 30 CA / 70 Exam are available as starting points that can be customised. |
| Level-based schemes | A school can maintain separate schemes for different class levels such as Primary and Secondary. |
| Term versioning | Each published scheme is locked for the term. A new scheme can be drafted for the next term without affecting the current one. |
| Gradebook reflection | Once published, the Teacher gradebook automatically renders one score-entry column per defined component. |

### Appendix C: Referral Programme — Earning Logic

| Scenario | Who Earns | Split | Conditions |
|----------|-----------|-------|------------|
| Regional Manager personally onboards a school | Regional Manager | 100% of manager referral rate | KYC verified; no undisclosed conflict |
| Subordinate onboards a school using their sub-code | Subordinate and Regional Manager | Subordinate rate plus manager override rate as configured | Both KYC verified; no conflict |
| School self-registers with a manager's referral code | Regional Manager | 100% of manager referral rate | KYC verified |
| School self-registers with a subordinate's sub-code | Subordinate and Regional Manager | Split applies as above | Both KYC verified |
| Tenant has an open IVP investigation case | All earners | All earnings held | Held until case is resolved |
| Participant is deactivated | None inherited automatically | Held or forfeited per platform policy | Manager does not inherit |
| Total payout would exceed 40% of PSF collected | Capped | Excess held to next cycle | Hard cap enforced per payout cycle |

### Appendix D: Workflow Types

| Workflow Type | Initiator | Approver Chain | Action on Final Approval |
|---------------|-----------|----------------|--------------------------|
| Term Closure | Principal or School Owner | System gate check (PSF, payments, results, corrections) then Principal or School Owner confirms | Lock all term enrollment records; make report cards downloadable; notify staff |
| Academic Year Closure | Principal or School Owner | System gate check (all terms closed) then Principal or School Owner confirms | Archive year; no new records may be created against it |
| Student Promotion Batch | Admin Officer or Principal | Principal confirms promotion list | Create promotion records; pre-assign students to class arms in next term |
| Student Graduation | Admin Officer or Principal | Principal or Exam Officer confirms graduation list | Set student status to graduated; generate leaving certificate; remove from future enrollment |
| Held-Back Override | Principal | School Owner approval where configured | Record held-back flag with reason; assign student to same class level in next year |
| Refund Request | Cashier | Accountant then Principal then Owner as configured | Create negative transaction; notify parent |
| Grade Correction | Teacher | Exam Officer then Principal | Update gradebook; log original and corrected values; re-compute result if already published; notify parent |
| Admission Decision | Admin Officer | Principal; Owner if configured | Update admission status; send offer letter |
| Financial Adjustment | Accountant | Principal then Owner | Apply adjustment; generate audit entry |
| Student Transfer Out | Admin Officer | Principal | Generate transfer certificate; update enrollment records |
| PSF Waiver | Platform Administrator | Second Platform Administrator | Set obligation status to waived; log in Revenue Lost to Waivers report |
| PSF Rate Override | Platform Administrator | Second Platform Administrator; Platform Owner if below floor | Create new rate snapshot; notify tenant |
| Ledger Adjustment | Platform Administrator | Second Platform Administrator | Post balanced adjustment entries to platform ledger |
| Support Break-Glass | Platform Administrator | Implicit via ticket binding | Log activation; notify School Owner within five minutes |
| Staff Onboarding | Admin Officer or Principal | Principal confirms invite | Send invitation email; create pending staff profile |
| Staff Role Change | Principal or School Owner | School Owner approval where configured | Update role assignment; invalidate all active sessions for the affected staff member; audit-log old and new role |
| Staff Deactivation | Principal or School Owner | System gate check (singleton role warning) then Principal confirms | Deactivate account; revoke all active sessions; preserve all historical records |
| MFA Device Reset | User self-service or Platform Administrator | Identity verification via email OTP | Deregister all devices; invalidate all sessions; force MFA re-enrollment on next login |
| PSF Reversal on Refund | Cashier or Accountant | Platform Revenue Operations | Set PSF treatment to reversed; post ledger entry |
| IVP Enforcement Action | Platform system automatically | Platform Administrator review | Apply IVP estimated enrollment for PSF; notify school |
| DSAR Request | Parent or Student | Data Protection Officer | Fulfill data request within thirty days per NDPA |

### Appendix E: Glossary

| Term | Definition |
|------|------------|
| Loomis | The official product name of the school management SaaS platform |
| Academic Year | A named period (e.g. "2026/2027") that contains one or more academic terms. Only one academic year per tenant may be active at a time. |
| Academic Term | A sub-period within an academic year during which teaching, assessment, and fee collection occur. Each term has an enrollment window, a census lock date, and a status lifecycle (draft → open → census locked → closed). |
| Class Level | A named level of study within the school's academic structure, such as Primary 4, JSS2, or SS3. |
| Class Arm | A specific section within a class level assigned to a Class Teacher, such as JSS2A or JSS2 Gold. |
| Class Progression Map | A tenant-defined configuration that specifies which class level a student moves to at the end of an academic year, and which class level is the terminal level triggering graduation. |
| Student Promotion | The process of moving active students from their current class level to the next class level at the start of a new academic year, or keeping them at the same level when held back. |
| Held Back | A student who is assigned to remain at the same class level for the next academic year rather than progressing. Requires a documented reason and principal confirmation. |
| Student Graduation | The process of formally completing a student's enrolment at the school upon completion of the terminal class level. Graduated students remain in historical records but are not enrolled in future terms. |
| Leaving Certificate | An official document generated by the platform recording a graduated student's academic summary and confirmation of completion. |
| Academic Calendar | An informational record of key dates within a term — such as mid-term break, examination period, and result day — visible to all school users but not operationally enforced by the platform. |
| PSF | Per-Student Fee — platform revenue charged once per billable enrolled student per academic term, created at census lock |
| PSF Obligation | The platform's immutable record of PSF owed by a school for a specific student in a specific term |
| PSF Settlement | A record that a payment has partially or fully discharged a PSF obligation |
| Census Lock | The act of attesting to and locking the official term enrollment count, triggering all PSF obligations for that term |
| IVP | Independent Verification Pipeline — the platform's multi-signal system for detecting enrollment underreporting |
| MTC | Minimum Term Commitment — the contractually agreed minimum billable student count per term |
| Tenant | A single school instance provisioned on Loomis with isolated data and configuration |
| Grading Scheme | A tenant-defined configuration mapping named assessment components to weighted percentage contributions totalling one hundred percent |
| Referral Code | A 96-bit-entropy code, stored only as a cryptographic hash, issued to each referral participant after KYC approval |
| Class Teacher | A Teacher who has been assigned the Class Teacher role extension, granting additional responsibilities: attendance marking, class-level read-only gradebook, and parent communication |
| Gradebook Entry | A per-student, per-subject record containing individual component scores and the system-computed weighted total |
| Grade Correction Workflow | A formal approval process required to amend a locked gradebook entry, initiated by the subject Teacher and approved by the Exam Officer and Principal |
| Break-Glass Access | A time-limited (30 minutes), ticket-bound, individually-logged, and tenant-notified emergency access mechanism for Platform Administrators |
| Idempotency Key | A unique client-supplied key that ensures a financial API call is processed exactly once regardless of how many times the request is sent |
| DPO | Data Protection Officer — the role responsible for NDPA 2023 compliance, DSAR handling, and breach notification |
| DSAR | Data Subject Access Request — a person's right under the NDPA to access, correct, delete, or restrict their personal data |
| Offline Queue | A device-local store for actions performed without connectivity, cryptographically signed per tenant and device, automatically synchronised on reconnection |
| PSF True-Up | A contractual clause requiring a school to pay back-PSF plus a fifty percent penalty if a platform audit finds enrollment underreporting exceeding ten percent |
| RPO | Recovery Point Objective — maximum acceptable data loss in a failure event |
| RTO | Recovery Time Objective — maximum acceptable downtime in a failure event |
| RLS | Row-Level Security — a database policy that enforces tenant identifier scoping at the query execution layer |
| NDPA | Nigeria Data Protection Act 2023 |
| NDPC | Nigeria Data Protection Commission |
| Staff Profile | A persistent record within a tenant that captures a staff member's employment history, role assignments, subject assignments, and account status from onboarding through deactivation |
| Subject Assignment | A record linking a Teacher to a subject and class arm for a specific term, determining their gradebook write access for that term |
| Class Teacher Extension | An additional capability added to a Teacher account that grants attendance marking, class-level gradebook read, and direct parent messaging for a specific class arm and term |
| Staff Invitation | A time-limited (48-hour) one-time link sent to a new staff member's email to complete account setup, created as part of the staff onboarding workflow |
| Idle Timeout | Session invalidation triggered by a period of inactivity — thirty minutes for browser sessions and sixty minutes for mobile sessions — regardless of the session's absolute lifetime |
| Absolute Timeout | The hard maximum lifetime of a session token — eight hours for access tokens and thirty days for refresh tokens — regardless of whether the session has been active |
| Registered Device | A device from which a user with mandatory MFA has successfully completed an MFA challenge; eligible for a persistent token that reduces MFA friction for thirty days |
| Persistent Device Token | A cryptographically signed, user-and-device-bound token stored on a registered device that allows reduced MFA friction on subsequent logins; invalidated by logout, device deregistration, or MFA reset |
| Session Revocation | The immediate invalidation of one or all active sessions for a user, triggered by events such as password change, role change, deactivation, or MFA device reset; enforced at the API layer via a token blacklist or version counter |
| Token Blacklist | A server-side record of access or refresh tokens that have been explicitly revoked before their natural expiry time, checked on every authenticated API request |

---

*SRS v3 supersedes SRS v2 in its entirety. All requirements in SRS v2 not explicitly revised or removed remain in force. New and revised requirements are identified in Section 4 with the notations New in v3 and Revised in v3. The Loomis Revenue Integrity Architecture FINAL document is the authoritative engineering specification for all revenue integrity, platform security, and compliance implementations described in this SRS.*
