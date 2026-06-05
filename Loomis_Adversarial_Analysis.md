# Loomis SRS v2 — Adversarial Failure Analysis
**Classification:** Red Team / Pre-Build Review  
**Date:** 5 June 2026  
**Analyst Persona:** Attacker, Dishonest Insider, Regulator, Investor  

---

> **Purpose:** This document identifies every meaningful vulnerability, ambiguity, and design gap in the Loomis SRS v2 that could harm the **platform** — its revenue, data integrity, security, and legal standing. School-internal staff/parent conduct is out of scope. Findings are ranked by severity within each category.

---

## 1. REVENUE LEAKAGE

### 1.1 PSF Bypass via Offline Payment Path — **CRITICAL**
**Vector:** Cashier logs a payment as an offline/cash transaction (FR-FIN-005). The SRS says offline payments "remain pending until verified by the Accountant." But the PSF is described as triggered "at the point of fee payment processing."

**Attack:** A school routes all fee collection through the offline path. The Accountant marks payments "verified" without the system ever running the PSF calculation — because no payment gateway webhook was fired. The school collects student fees normally but Loomis never receives its PSF.

**Gap:** The SRS never specifies *when* the PSF is calculated for offline payments: at logging time, at verification time, or at reconciliation time. If it's only calculated when a gateway webhook fires, offline payments are structurally PSF-free.

**Revenue impact:** Massive in cash-dominant markets. A school with 500 students paying cash every term = NGN 1.5M per year in untracked PSF.

---

### 1.2 Student Enrollment Count Manipulation — **HIGH**
**Vector:** The PSF is "per enrolled student per term." It is charged "at the point of school fee payment."

**Attack:** A school processes only a fraction of actual paying students through the platform. The rest pay cash outside the system. Platform collects PSF only on the fraction it sees — with no way to detect the gap.

**Gap:** Loomis has no mechanism to independently verify how many students are actually enrolled vs. how many fee transactions are processed. The enrollment count in FR-SIS-005 is internal to the tenant — the platform trusts whatever the school puts in.

---

### 1.3 Fee Payment Splitting / Instalment Avoidance — **MEDIUM**
**Attack:** A school structures fees so one small instalment is processed through the platform (triggering a tiny PSF) while the majority of the school fee is collected offline in subsequent tranches.

**Gap:** The SRS says PSF is "per enrolled student per term" but the payment model appears to be per transaction. It is never defined whether PSF applies to the first payment only, the full term total, or each partial payment. This ambiguity is exploitable by design.

---

### 1.4 PSF Rate Lag Exploitation — **MEDIUM**
**Attack:** A Platform Admin raises the PSF rate. The SRS says changes take effect from the *next billing term only* (FR-PLT-002). A school front-loads all fee collection in the current term to lock in the lower rate — entirely within the rules as written.

**Insider variant:** A Platform Admin delays publishing a rate increase by one term to benefit a school they have a side relationship with — costing Loomis a full term of higher PSF from that tenant.

**Gap:** No audit requirement on when a rate change was *decided* vs. *applied*. Only the effective date is logged, not the decision date.

---

### 1.5 Refund Workflow as PSF Revenue Reversal — **MEDIUM**
**Attack (FR-FIN-007):** Approved refunds are recorded as "negative transactions." The SRS never states whether refunds reverse the PSF levy. A school processes 500 students' payments (PSF collected), then bulk-files refund requests citing "fee overpayment." If the PSF is refunded alongside the school fee, the school re-collects fees directly while Loomis loses its revenue.

**Gap:** PSF treatment on refund approval is completely undefined. This needs an explicit policy: PSF is non-refundable once a term has been processed, or PSF follows the refund — either way it must be stated.

---

### 1.6 Referral Earnings Eroding PSF Margin — **MEDIUM**
**Attack:** Referral earnings are paid from PSF revenue. Appendix C shows Regional Managers earning on *all schools in their network indefinitely*. If referral percentages are configured without a floor constraint, total referral payouts from a school could exceed the PSF actually collected from it.

**Gap:** The SRS contains no cap on referral percentages, no constraint that total payouts must remain below PSF collected, and no financial floor modelling. Platform Admins could misconfigure this into a net-loss programme.

---

## 2. PLATFORM-LEVEL FRAUD

### 2.1 Offline Payment — PSF Never Triggered, Platform Never Knows — **CRITICAL**
**FR-FIN-005:** Offline payments sit as "pending" until the Accountant verifies them. The SRS contains no timeout, no escalation, and no requirement that the PSF calculation fires at verification time.

**Attack:** A school's offline payments accumulate as perpetually "pending." Students are treated as paid internally. PSF is never calculated. There is no automated flag to Loomis when an offline payment ages beyond a threshold without being verified.

**Gap:** No SLA or maximum age for unverified offline payments. No automated alert to the platform when offline payment volume at a tenant is disproportionately high vs. online payments — a pattern that should trigger a PSF audit.

---

### 2.2 Phantom Student Registration for PSF Inflation — **HIGH**
**Attack:** This is fraud *against the school* but it directly harms Loomis too: a dishonest Admin Officer registers ghost students. Fee payments are processed for these ghosts through the platform — PSF is triggered and collected by Loomis on transactions that don't represent real students. When the fraud is discovered, the school demands PSF refunds on all ghost-student payments.

**Gap:** No independent verification that a registered student is a real enrolled person. The platform's PSF revenue is exposed to clawback risk from fraudulent enrollment data it had no way to detect.

---

### 2.3 Regional Manager Creates Ghost Subordinates — **HIGH**
**Attack (FR-REG-002):** Regional Managers can create Subordinate accounts with no identity verification requirement. Each Subordinate gets a referral sub-code. A manager creates ghost subordinates whose sub-codes they personally control, routes onboardings through those codes, and manipulates referral split calculations to maximise their own payout.

**Gap:** The SRS specifies no identity verification for Subordinate account creation. A Regional Manager can create unlimited sub-accounts and exploit the referral tier structure without any platform-side detection.

---

### 2.4 Platform Admin — PSF Rate Set to Zero — **HIGH**
**Attack:** A Platform Admin sets a custom PSF rate of NGN 0 for a school (FR-PLT-002 explicitly permits per-school PSF rate overrides). The school processes hundreds of students per term at zero PSF indefinitely.

**Gap:** There is no requirement for a second Platform Admin to countersign a PSF rate override. No approval workflow. No automated alert when a school's PSF rate is set below a minimum threshold. The audit log records the action, but if logs are reviewed infrequently, this runs silently for multiple terms.

---

## 3. PERMISSION LOOPHOLES

### 3.1 Class Teacher + Teacher Role Conflict — Grade Visibility Advantage — **HIGH**
**CON-004 / ASM-008:** "Every Class Teacher is also a Teacher." A Class Teacher has read-only access to all subjects' grades in their class *and* grade-entry access to their own subject.

**Attack:** A Class Teacher who is also the subject Teacher for their own class can see all other subjects' uncommitted scores via the Class Teacher view while their own subject's scores are not yet visible to others — enabling strategic score timing to influence class rankings or averages before publication.

**Gap:** The SRS doesn't address the conflict of interest when a Class Teacher is also the subject Teacher in the same class. The combined role should have an explicit restriction preventing the Class Teacher gradebook view from displaying unpublished scores from *other* teachers while the Class Teacher's own scores remain uncommitted.

---

### 3.2 Parent Email as Cross-Tenant Identity Key — Account Takeover Risk — **CRITICAL**
**ASM-003:** "Parent email addresses are unique system-wide and serve as the primary cross-tenant identity key."

**Attack 1:** An Admin Officer at any school can trigger the parent-linking flow (FR-SIS-003) using any email address. If "identity verification" is weak or undefined, a bad actor links a child to an email account they control — gaining cross-tenant access to that child's records across all linked schools.

**Attack 2 (account squatting):** An attacker registers a parent email before the real parent self-registers. They control the account; the real parent cannot reclaim it without a defined recovery process.

**Gap:** "Parent identity verification shall be required before linking is finalised" (FR-SIS-003) is completely undefined — no mechanism, no actor responsible, no fallback. This is a critical specification gap that will produce an insecure implementation.

---

### 3.3 Regional Manager Read Access — Competitor Intelligence — **MEDIUM**
**FR-REG-004:** Regional Managers get full read access to all schools in their region: enrollment trends, fee collection efficiency, attendance rates, academic performance.

**Attack:** A competitor places an employee as a Regional Manager (or bribes an existing one). They gain structured, cross-school performance intelligence across an entire region — enough to identify which schools are vulnerable to poaching or undercutting.

**Gap:** No requirement for Regional Managers to be verified as non-competitors. No data access agreement or NDA requirement in the onboarding spec. No anomaly detection on Regional Manager data access patterns.

---

### 3.4 "Partial" Subordinate Access — Undefined Scope — **MEDIUM**
**Appendix A:** Subordinates have "Partial" regional analytics access. "Partial" is never defined anywhere in the SRS.

**Gap:** An undefined access scope will be implemented arbitrarily — and arbitrary access control implementations produce security bugs. This needs to be explicitly defined before development of the regional layer begins.

---

### 3.5 Grading Scheme — Re-publish Mid-Term Not Explicitly Blocked — **MEDIUM**
**FR-ACA-004:** Grading schemes are "versioned per academic term" and "once published, locked." But the SRS doesn't define at the API level who can unlock and re-publish a revised scheme mid-term, or whether this is technically prevented vs. just discouraged by policy.

**Gap:** If an Exam Officer (who has "Configure" access to grading schemes per Appendix A) can re-publish a revised scheme mid-term, score weightings change retroactively for that term's already-entered grades — affecting computed results platform-wide for that tenant without any record of the original scheme being active.

---

## 4. TENANT ISOLATION FAILURES

### 4.1 Parent Cross-Tenant Data Exposure — **CRITICAL**
**CON-002:** "Parent identity resolution across tenants must never expose data from School A to School B."

**Attack:** The parent entity holds `linked_student_ids[]` across multiple tenants. If the parent dashboard API fetches all linked students with a single query that joins across a shared student table without strict per-tenant scoping, School A's student data becomes visible to a parent who only has a child at School B.

**Gap:** The SRS asserts isolation but specifies no technical enforcement mechanism for the parent cross-tenant query. No requirement that the API issues separate tenant-scoped sub-queries per linked student, never joining across tenant namespaces. This is the most exploitable isolation gap — easy to introduce as a query optimisation and catastrophic when it happens.

---

### 4.2 File Storage — Cross-Tenant URL Exposure — **HIGH**
**Section 10.4:** "File access scoped to tenant — no cross-tenant file URLs accessible." Learning materials, assignment attachments, and profile photos are stored in cloud object storage.

**Attack:** If pre-signed URLs are generated without tenant scope validation, a user who discovers or guesses a file URL from another tenant can access it directly. Cloud object storage paths are often predictable (tenant_id/student_id/filename).

**Gap:** The SRS states the requirement but provides no mechanism — signed URLs with expiry? Bucket-level ACL policies? Tenant-prefix path enforcement? Without a specified mechanism, implementation will vary and will likely be insecure at launch.

---

### 4.3 Offline Queue Sync — Cross-Tenant Contamination — **MEDIUM**
**MOB-005:** Offline attendance data is queued locally on-device and synced on reconnect.

**Attack:** A Class Teacher using the same device across two schools (or a sync race condition in a multi-tenant session) could submit School A's offline attendance payload to School B's tenant API endpoint.

**Gap:** The SRS doesn't specify that offline queue entries must be cryptographically bound to their originating tenant context, or that the sync endpoint validates the tenant_id in the payload against the authenticated session's tenant before committing records.

---

### 4.4 Support Ticket Module — Platform Admin Impersonation Risk — **MEDIUM**
**FR-PLT-006:** Platform Admins manage support tickets "linked to specific tenants." The SRS doesn't define how ticket resolution works in practice — whether it involves any form of elevated access or impersonation within a tenant's data context.

**Gap:** No break-glass access policy is defined. No requirement to notify the tenant when a Platform Admin accesses their data for support purposes. If support resolution involves reading or modifying tenant records directly, this is an unlogged, uncontrolled data access path.

---

## 5. REFERRAL ABUSE

### 5.1 Self-Referral Loop — Manager Onboards Their Own School — **HIGH**
**Appendix C:** "Regional Manager personally onboards a school → earns 100% of manager referral rate."

**Attack:** A Regional Manager onboards a school in which they have a hidden financial interest using their own referral code. They earn a referral percentage on every PSF payment from that school indefinitely — while simultaneously being the oversight actor responsible for monitoring it.

**Conflict:** The manager has zero incentive to flag PSF discrepancies or performance issues at a school generating their referral income. FR-REG-006 alerts go to the Regional Manager — who controls whether to act on them.

**Gap:** No prohibition on Regional Managers having a financial interest in schools they onboard or oversee. No conflict-of-interest declaration requirement in the SRS.

---

### 5.2 Deactivated Subordinate — Referral Earnings Orphan — **HIGH**
**CON-009:** Referral codes are permanently attached to school records and cannot be retroactively changed. FR-REG-002 allows Regional Managers to deactivate Subordinates.

**Attack:** A Regional Manager deactivates a Subordinate who onboarded many schools. The sub-code is still permanently attached to those schools. The SRS never defines what happens to earnings from those schools after deactivation — do they revert to the Regional Manager? Accumulate unclaimed? Flow to the platform?

**Gap:** This is a financial ledger gap with no defined behaviour. It will produce either unintended manager enrichment or unreconciled earnings, and is exploitable by a manager who times deactivations strategically.

---

### 5.3 Referral Code — Weak Generation Allows Guessing — **MEDIUM**
**FR-PLT-001:** Schools can self-register with a referral code. The SRS says codes are "auto-generated" but specifies no entropy requirement, no format, and no rate-limiting on code entry attempts at onboarding.

**Attack:** If codes are generated with low entropy (short, sequential, or predictable), a bad actor can enumerate valid codes and register a school under a specific Regional Manager's code without their involvement — attributing PSF earnings to an arbitrary referral account, or generating fraudulent referral credit.

---

### 5.4 Referral Earnings — No Dispute or Verification Mechanism — **MEDIUM**
**FR-REG-003:** Regional Managers see their earnings dashboard. Earnings are computed in "a separate global ledger." The SRS provides no mechanism for a manager to audit or verify the calculation inputs (which PSF transactions from which schools generated which earnings).

**Gap:** A Regional Manager cannot independently verify their payout is correct. No dispute resolution process is defined. This creates both a trust problem (managers suspect underpayment) and a liability problem (if the calculation has a bug, Loomis has no defined correction process).

---

## 6. PAYMENT BYPASS

### 6.1 Webhook Replay / No Idempotency — **CRITICAL**
**Section 10.1:** PSF is triggered by "webhook handling for real-time payment confirmation."

**Attack:** A legitimate payment webhook for Student A is replayed. If idempotency is not enforced — no unique gateway transaction ID checked against a processed-events table — the same payment event triggers PSF calculation and "paid" status update multiple times, or is used to mark different students as paid from a single real transaction.

**Gap:** The SRS mentions webhook handling but specifies no idempotency requirement, no webhook signature verification requirement, and no replay attack prevention mechanism. This is a standard payment security requirement that is missing entirely.

---

### 6.2 Offline Payment — Permanent Pending, PSF Never Fires — **HIGH**
**FR-FIN-005:** Offline payments are "pending until verified by the Accountant."

**Attack:** A school logs all payments as offline. Students are treated internally as having paid. No Accountant verification ever occurs in the system. Payments age indefinitely as "pending." PSF is never triggered. There is no platform-side detection because there is no timeout or escalation rule.

**Gap:** No maximum age for unverified offline payments. No automated escalation to the Platform Admin when offline payments are overdue. No requirement that student access to results or report cards is gated on *verified* (not just logged) payment status.

---

### 6.3 PSF Calculation Basis — Instalment vs. Full Fee Undefined — **MEDIUM**
**Gap (repeat of 1.3 in payment context):** The SRS is silent on whether PSF is calculated on each partial payment or on the confirmed full fee total. A school that structures fees as 10 small instalments processed through the platform and one large offline payment would technically trigger PSF 10 times on small amounts — possibly less than PSF on the full fee — or the instalment model could be used to minimise total PSF collected.

A definitive PSF calculation policy (per full enrolled term, not per transaction tranche) needs to be specified.

---

## 7. OPERATIONAL BOTTLENECKS

### 7.1 Exam Officer — Single Point of Failure for Result Publishing — **HIGH**
**FR-ACA-007:** Only the Exam Officer can publish results and generate report cards (Appendix A: "Full" access to Results/Exams is exclusive to this role).

**Bottleneck:** If the Exam Officer is absent, resigns, or is incapacitated at term-end, no results can be published. No delegation or deputy mechanism is defined. No escalation path exists.

**Gap:** No deputy role assignment for Exam Officer. No timeout after which the Principal can override and publish. This is a single-role bottleneck that will cause real operational failures.

---

### 7.2 Timetable Officer — Single Point of Failure — **MEDIUM**
Same structural problem: only the Timetable Officer can build and adjust timetables. No delegation or acting-role mechanism is defined.

---

### 7.3 Grade Correction Workflow — No SLA or Escalation — **HIGH**
**FR-WFL-002:** Grade corrections route Exam Officer → Principal. If either is inactive or has a backlog, the correction stalls indefinitely. If results are published before a correction completes, re-computation triggers re-notification to all parents — a disruptive cascade.

**Gap:** No SLA on workflow step resolution. No escalation if an approver is inactive beyond X hours. No bulk approval for high-volume scenarios (e.g., 50 correction requests after a system data entry error).

---

### 7.4 Offline Attendance — 7-Day Retention Cliff — **MEDIUM**
**ASM-010:** "Offline attendance data shall not be retained longer than 7 days unsynced before the system prompts the Class Teacher to resolve."

**Gap:** "Prompts to resolve" is undefined. What is the resolution action — force sync, discard, or preserve? If data is discarded after the prompt is ignored, an entire week of attendance records is silently deleted with no recovery path and no platform-side record that data was lost.

---

### 7.5 No Bulk Operations — Peak Period Scalability — **MEDIUM**
The SRS defines no bulk grade import, bulk payment processing, or bulk enrollment mechanism. At a school with 1,500 students, requiring every individual fee transaction and grade entry to be processed one at a time creates a human bottleneck at term-end peaks — which is precisely when the PSF billing engine is under maximum concurrent load.

---

## 8. SCALING FAILURES

### 8.1 PSF Billing Engine — No Idempotency or Retry Specification — **HIGH**
**Section 6.2:** "The PSF billing engine shall process concurrent payments across thousands of tenants without degradation." This is stated as a requirement but the mechanism is unspecified.

**Failure mode:** Term-end fee payment deadlines trigger thousands of simultaneous parent payment initiations across all tenants. PSF calculation, remittance batching, and webhook processing are hit simultaneously. Without a defined queue, retry policy, and dead-letter strategy, PSF calculations may be delayed, duplicated, or silently dropped — with no recovery mechanism.

---

### 8.2 Referral Ledger — Payout Calculation at Scale — **HIGH**
As the network grows (many Regional Managers, many Subordinates, many schools, hundreds of students each paying per term), the monthly payout reconciliation becomes an increasingly complex calculation across the global ledger. No performance requirement or scaling strategy is specified for this calculation.

**Failure mode:** At scale, monthly payout runs could take hours, produce partial results, or time out — with no defined behaviour for incomplete payout cycles.

---

### 8.3 Audit Log — 5-Year Immutable Retention at Scale — **MEDIUM**
**CON-007:** Audit logs must be retained immutably for 5 years. "Every write action" is logged (FR-AUD-001). At 50,000 concurrent users with multiple writes per minute, the audit log grows at enormous scale.

**Gap:** No partitioning strategy, archival approach, or query performance requirement for the audit log is defined. At year 4–5, compliance report queries against unpartitioned audit data will be prohibitively slow — precisely when regulatory review is most likely.

---

### 8.4 Parent Cross-Tenant Dashboard — Fan-Out Query Load — **MEDIUM**
A parent with children in 5 schools triggers queries across 5 isolated tenant namespaces on every dashboard load. At platform scale with thousands of multi-school parents, this fan-out query pattern creates N × M database load.

**Gap:** No caching strategy or performance requirement is defined for cross-tenant parent dashboard queries. This will become a performance bottleneck as parent adoption grows.

---

## 9. INVESTOR / REGULATORY PERSPECTIVE

### 9.1 Revenue Model Is Entirely Trust-Based — **CRITICAL (Investor)**
The PSF model depends entirely on schools faithfully processing all student fee payments through the platform. Loomis has no independent mechanism to verify how many students a school actually has, how much they pay, or whether the platform sees all transactions.

**A school could operate at 100% capacity while processing 20% of students through the platform — with zero detection by Loomis.** This is an existential revenue integrity gap at scale.

---

### 9.2 Referral Programme — Infinite Liability, No Cap — **HIGH (Investor)**
Referral earnings are paid "indefinitely" (Section 2.3.2). As the referral network matures, early-mover Regional Managers compound earnings forever from schools they onboarded years prior — regardless of ongoing contribution.

**Risk:** If referral-heavy regions underperform or schools churn, the referral liability on remaining schools could exceed PSF revenue from them. The SRS has no sunset clause, no performance requirement for continued referral eligibility, and no maximum referral payout ratio.

---

### 9.3 No Data Residency or NDPA Compliance Specification — **HIGH (Regulator)**
Section 6.6 references "applicable data protection regulations" without naming them. In the Nigerian market (implied by NGN pricing), the Nigeria Data Protection Act (NDPA) 2023 has specific requirements around consent, data subject rights, cross-border transfers, and breach notification timelines.

**Gap:** No breach notification timeline, no data subject access request (DSAR) workflow, no data deletion capability, no cross-border transfer policy. A regulator examining this system could find it non-compliant on day one of launch.

---

### 9.4 MFA Not Enforced for High-Risk School Roles — **HIGH (Regulator)**
**SEC-AUTH-003:** MFA for school Admin-level accounts is "available" — individual schools configure whether it is mandatory.

**Gap:** A School Owner or Principal accessing full student financial data and PII is not required by the platform to use MFA. In a regulated environment handling children's personal data, this is a material compliance gap that Loomis — not the school — will be held accountable for.

---

### 9.5 Audit Log — Read Access Not Logged — **MEDIUM (Regulator)**
**FR-AUD-001** logs "every write action." But read access to sensitive data — a Platform Admin reading student PII, a Regional Manager viewing financial performance across schools — is not required to be logged.

**Regulatory risk:** In most data protection frameworks, access to personal data must be audited, not just modification. The current spec logs what was changed but not who read what.

---

### 9.6 No Penetration Testing Requirement — **MEDIUM (Investor/Regulator)**
The SRS references OWASP guidelines (Section 1.4) but contains no requirement for pre-launch penetration testing, vulnerability scanning, or third-party security audit. For a platform handling children's PII, school financial data, and a payment pipeline, this is a material omission that both regulators and investors will flag.

---

## 10. SUMMARY RISK REGISTER

| # | Finding | Category | Severity |
|---|---------|----------|----------|
| 1 | Offline payment PSF bypass — calculation trigger undefined | Revenue Leakage | CRITICAL |
| 2 | Revenue model entirely trust-based — no enrollment verification | Investor Risk | CRITICAL |
| 3 | Parent email cross-tenant key — identity verification undefined | Permission / Security | CRITICAL |
| 4 | Webhook replay — no idempotency on PSF trigger | Payment Bypass | CRITICAL |
| 5 | Parent cross-tenant data exposure via query design | Tenant Isolation | CRITICAL |
| 6 | Student enrollment underreporting — platform has no visibility | Revenue Leakage | HIGH |
| 7 | Ghost subordinates — referral split manipulation | Referral Abuse | HIGH |
| 8 | Platform Admin sets PSF = 0 — no countersign required | Platform Fraud | HIGH |
| 9 | Offline payment permanent pending — no timeout or escalation | Revenue Leakage | HIGH |
| 10 | Self-referral loop — manager onboards own school | Referral Abuse | HIGH |
| 11 | Deactivated subordinate — referral earnings orphaned | Referral Abuse | HIGH |
| 12 | File storage — cross-tenant URL exposure, no mechanism spec | Tenant Isolation | HIGH |
| 13 | PSF billing engine — no idempotency or retry spec | Scaling Failure | HIGH |
| 14 | Referral earnings — indefinite liability, no cap | Investor Risk | HIGH |
| 15 | Exam Officer single point of failure — no deputy or delegation | Operational | HIGH |
| 16 | Grade correction workflow — no SLA or escalation path | Operational | HIGH |
| 17 | No data residency / NDPA compliance spec | Regulatory | HIGH |
| 18 | MFA not mandatory for school Admin-level accounts | Regulatory | HIGH |
| 19 | No breach notification or DSAR workflow | Regulatory | HIGH |
| 20 | Class Teacher + Teacher role — unpublished score visibility conflict | Permission Loophole | HIGH |
| 21 | Competitor as Regional Manager — structured school intelligence access | Permission Loophole | MEDIUM |
| 22 | "Partial" subordinate access — never defined | Permission Loophole | MEDIUM |
| 23 | Grading scheme re-publish mid-term — not technically blocked | Permission Loophole | MEDIUM |
| 24 | Fee splitting across tranches — PSF basis undefined | Revenue Leakage | MEDIUM |
| 25 | PSF rate lag — deliberate front-loading of collection | Revenue Leakage | MEDIUM |
| 26 | Refund workflow — PSF reversal treatment undefined | Revenue Leakage | MEDIUM |
| 27 | Referral programme — total payout may exceed PSF margin | Revenue Leakage | MEDIUM |
| 28 | Referral code — low entropy, no rate-limit on code attempts | Referral Abuse | MEDIUM |
| 29 | Referral earnings — no dispute or audit mechanism for managers | Referral Abuse | MEDIUM |
| 30 | Offline queue sync — cross-tenant contamination risk | Tenant Isolation | MEDIUM |
| 31 | Support ticket resolution — no tenant notification or access log | Tenant Isolation | MEDIUM |
| 32 | Offline attendance — 7-day cliff behaviour undefined | Operational | MEDIUM |
| 33 | No bulk operations — peak period processing bottleneck | Operational | MEDIUM |
| 34 | Referral ledger payout calculation — no scaling strategy | Scaling Failure | HIGH |
| 35 | Audit log — 5-year retention, no partitioning or archival strategy | Scaling Failure | MEDIUM |
| 36 | Parent cross-tenant dashboard — fan-out query load unaddressed | Scaling Failure | MEDIUM |
| 37 | Audit log — read access not logged | Regulatory | MEDIUM |
| 38 | No penetration testing requirement | Regulatory / Security | MEDIUM |
| 39 | Timetable Officer single point of failure | Operational | MEDIUM |

---

## 11. TOP PRIORITY MITIGATIONS

1. **Define PSF trigger for offline payments** — PSF must fire at Accountant verification time; unverified offline payments older than X days auto-escalate to Platform Admin.
2. **Define parent identity verification mechanism** — minimum OTP to parent's registered email+phone before any Admin Officer link is finalised; platform enforces this, not the school.
3. **Implement webhook idempotency** — every payment event carries a unique gateway transaction ID checked against a processed-events table before PSF is calculated.
4. **Require countersign for PSF rate overrides** — no single Platform Admin can set a per-school PSF rate without a second Admin approval, plus automated tenant notification.
5. **Define referral earning cap** — total referral payouts from any school cannot exceed a defined percentage of PSF collected from that school per period.
6. **Define deactivated subordinate earnings policy** — specify explicitly where orphaned referral earnings flow; prevent manager-timed deactivation from being used as enrichment.
7. **Specify "Partial" subordinate access explicitly** before regional layer development begins.
8. **Define PSF calculation basis** — per enrolled student per confirmed full-term fee, not per transaction tranche; documented in FR-FIN-002.
9. **Add NDPA compliance appendix** — DSAR workflow, data deletion, breach notification timeline, and consent flows before development of parent/student modules.
10. **Add Exam Officer deputy mechanism** — Principal can be designated as backup publisher; or a time-based escalation path after X hours of inaction at term-end.

---

*This document is a pre-build red team analysis for the Engineering, Product, and Legal teams. All findings are platform-level concerns. School-internal staff conduct is explicitly out of scope. Findings should be triaged and addressed before the relevant modules enter development.*
