# Loomis Platform — User Stories v1

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 05/06/2026 | Engineering Team | Initial user stories for all 14 functional modules aligned to SRS v3; 16 actor roles covered; epics US-PLT through US-HRM |

---

## Document Conventions

Each user story follows the format:

**[Story ID]: [Title]**
*As a [role], I want to [action], so that [benefit].*
Acceptance criteria are stated in plain prose beneath each story.

Stories are grouped by epic. Each epic corresponds to a functional module in SRS v3. Story identifiers use the prefix of the corresponding SRS module (e.g. US-PLT for Platform Management, US-HRM for Human Resources). Dependencies between stories are noted where relevant. Stories marked **[Rev Int]** touch the Revenue Integrity layer and have enhanced security or audit requirements.

---

## Epic Index

| Epic | Module |
|------|--------|
| US-PLT | Platform Management |
| US-REG | Regional Layer |
| US-ASM | Academic Session Management |
| US-SIS | Student Information System |
| US-ACA | Academic Management |
| US-FIN | Financial Management |
| US-COM | Communication |
| US-PAR | Parent Portal |
| US-STU | Student Portal |
| US-WRK | Workflow and Approval Engine |
| US-AUD | Audit and Compliance |
| US-REV | Revenue Integrity and Fraud Prevention |
| US-REF | Referral Programme Management |
| US-HRM | Human Resources and Staff Management |

---

## Epic US-PLT — Platform Management

**US-PLT-001: Provision a New School Tenant**
*As a Platform Administrator, I want to create a new school tenant with a name, tier, region, and initial PSF rate, so that the school can begin operating on the platform.*
The form requires a school name, physical address, primary contact email, assigned region, platform tier, and the referral code used during onboarding (if any). On submission, the system creates an isolated tenant record, sets the PSF rate to the platform default unless a pre-approved override exists, generates a School Owner invitation, and logs the provisioning event in the global audit trail. The referral code is validated and attribution is created before the tenant is activated. An invalid or unverified referral code blocks tenant activation and flags the case for Platform Operations review.

**US-PLT-002: Suspend and Reinstate a Tenant**
*As a Platform Administrator, I want to suspend a school tenant for non-payment or terms violation, so that the platform can enforce its contractual obligations without permanently deleting the tenant's data.*
Suspension immediately blocks all school-layer logins while preserving all data. Parents continue to receive read-only access to their children's historical records during suspension. The School Owner receives an email notification at the time of suspension with the reason and the escalation path. Reinstatement restores all logins and is audit-logged with the approving administrator.

**US-PLT-003: Configure the Platform-Wide PSF Rate**
*As a Platform Owner, I want to set the global default PSF rate, so that all newly onboarded schools begin billing at the correct rate.* **[Rev Int]**
Changing the global default rate triggers a step-up MFA challenge. The change is recorded as a timestamped rate snapshot. It does not alter existing PSF obligations already created in prior terms. The previous rate and the new rate are both stored. An audit log entry is created with the actor, old value, new value, and effective timestamp.

**US-PLT-004: Approve a Per-School PSF Rate Override**
*As a second Platform Administrator, I want to approve or reject a PSF rate override request submitted by a first Platform Administrator, so that no single operator can unilaterally reduce a school's billing rate.* **[Rev Int]**
The approval interface shows the requesting admin, the target school, the justification text, the proposed override rate, and the current rate. The approver cannot be the same person who submitted the request. Approval is logged with both actors. Rejection returns the request to a rejected state with the reason recorded.

**US-PLT-005: Monitor Platform Revenue Health**
*As a Platform Owner, I want to view a real-time revenue dashboard showing total PSF obligations created, total settled, total outstanding, and revenue lost to waivers, so that I can track platform financial health.*
The dashboard aggregates across all tenants and all terms. Each metric is drillable by tenant, by term, by region, and by time window. Figures shown are computed from the immutable platform ledger and cannot be manually adjusted from the dashboard.

**US-PLT-006: Activate Break-Glass Support Access**
*As a Platform Administrator, I want to open a time-limited support session on a specific tenant's data when responding to a support ticket, so that I can investigate and resolve tenant issues without requiring long-term standing access.* **[Rev Int]**
Break-glass activation requires entry of a valid support ticket identifier. The session is logged before any data access occurs. The affected School Owner receives a notification within five minutes unless the access is legally restricted. The session automatically expires after thirty minutes. All individual actions performed during the session are logged separately in the audit trail with an actor type of platform support access.

**US-PLT-007: View and Manage IVP Anomaly Cases**
*As a Platform Administrator, I want to view all active IVP anomaly cases, assign them to investigators, and record resolution outcomes, so that enrollment underreporting is investigated systematically.* **[Rev Int]**
The case list shows the tenant, the anomaly score, the reported enrollment, the estimated enrollment range, the signal types that triggered the case, and the current status. Assigning a case to an investigator sends a task notification. Closing a case requires a written resolution summary. Cases in active status block referral payouts for the affected tenant.

---

## Epic US-REG — Regional Layer

**US-REG-001: View the Regional Performance Dashboard**
*As a Regional Manager, I want to view a consolidated dashboard of all schools in my region showing enrollment trends, payment rates, and academic performance benchmarks, so that I can identify schools that need support or intervention.*
The dashboard shows aggregated metrics only — no school can see another school's individual data. Metrics include average attendance rate, average fee collection rate, and enrollment change quarter-on-quarter. Drilldown to a specific school is permitted for Regional Managers.

**US-REG-002: Onboard a New School**
*As a Regional Manager, I want to submit a new school for onboarding using my referral code, so that the school is attributed to me and I can begin earning referral income once it starts operating.*
The Regional Manager completes a school registration form on behalf of the school. The referral code is automatically attached. Attribution is created only after KYC and conflict-of-interest declaration are verified. The Regional Manager is notified when attribution is confirmed and when the school goes live.

**US-REG-003: Create and Manage a Subordinate**
*As a Regional Manager, I want to create a subordinate account and assign them a sub-code, so that they can onboard schools under my referral chain.*
Creating a subordinate requires the person's name, personal email, and phone number. A subordinate invitation is sent. The subordinate's sub-code is linked to the Regional Manager's code. The subordinate cannot earn income until their own KYC and conflict-of-interest declaration are verified. The Regional Manager cannot approve their own subordinate's KYC verification — this is blocked at the platform level.

**US-REG-004: View Referral Earnings Dashboard**
*As a Regional Manager, I want to see a breakdown of my referral earnings by school and by payout cycle, so that I can track my income and understand which schools are contributing.*
The dashboard shows earning entries per PSF obligation settled, the current cycle's accrued total, and the status of the current payout cycle. Held earnings — due to IVP investigations or disputes — are shown separately with the hold reason. The forty percent per-tenant payout cap and its current usage are displayed.

**US-REG-005: Receive Alerts on Schools at Risk**
*As a Regional Manager, I want to receive alerts when a school in my region shows unusual payment drop-off or attendance anomaly, so that I can proactively engage with the school.*
Alerts are generated by the platform's monitoring rules. The Regional Manager sees alerts on their dashboard and receives email notifications. Alert details include the school name, the indicator type, the threshold breached, and suggested actions. Acknowledging an alert logs the response.

---

## Epic US-ASM — Academic Session Management

**US-ASM-001: Create and Activate an Academic Year**
*As a School Owner, I want to create a new academic year and activate it, so that the school can begin operating under a new calendar period.*
Creating an academic year requires a label (for example 2025/2026), a start date, and an end date. Only one academic year can be in the active status at any time. Activating a year requires confirmation since the action cannot be reversed. The system logs the creation and activation with the actor and timestamp.

**US-ASM-002: Configure and Open a Term**
*As a Principal, I want to create a term within the current academic year, set its enrollment window, define the census lock date, and open it to begin operations, so that teachers and students can start academic activities.*
Each term requires a name (First, Second, or Third Term), a start date, an end date, and a census lock date. The census lock date cannot fall after the term end date. Opening a term changes its status from draft to open. Only one term can be in the open status within an academic year at any time.

**US-ASM-003: Lock the Enrollment Census**
*As a School Owner or Principal, I want to attest to the current enrollment count and lock the census, so that PSF obligations are created for the term.* **[Rev Int]**
The census lock screen shows the current billable student count, a breakdown by class level, and the Minimum Term Commitment for comparison. If the count is below the MTC, a warning is shown and confirmation is required. Locking the census requires MFA step-up. A digitally signed attestation record is created. One PSF obligation is created per billable enrolled student. This action cannot be undone.

**US-ASM-004: Close a Term**
*As a Principal, I want to close the current term after all results have been published and all financial obligations are reconciled, so that the term's records are locked and permanent.*
The term closure workflow checks that all gradebook entries are locked, all result sets are published, all pending grade correction workflows are resolved, and all offline payments are verified. If any gate check fails, the system presents the specific blockers. Closing a term locks all enrollment records for that term and makes report cards available for download.

**US-ASM-005: Promote Students at Year End**
*As an Admin Officer, I want to run the student promotion process at the end of the academic year, so that students move to the correct class level for the next year.*
The promotion screen displays the full student list with current class level and the system-suggested next class level based on the Class Progression Map. The Admin Officer may mark individual students as held back with a documented reason. The Principal reviews and confirms the promotion list. Upon confirmation, promotion records are created and students are pre-assigned to class arms for the next term. Held-back overrides exceeding a configured threshold require School Owner approval.

**US-ASM-006: Graduate the Final-Year Cohort**
*As a Principal, I want to graduate the students at the terminal class level, so that they are formally marked as completed and their leaving certificates are generated.*
The graduation screen shows all students at the terminal class level who have completed all term records for the current academic year. The Principal confirms the list. The Exam Officer may also confirm. Upon confirmation, each selected student's status changes to graduated, a leaving certificate is generated by the platform, and the student is removed from future enrollment pipelines. Graduated students remain in historical records and their data is preserved permanently.

**US-ASM-007: View the Academic Calendar**
*As a Teacher or Class Teacher, I want to view the academic calendar showing all key dates for the current term — including mid-term break, examination periods, and result day — so that I can plan my teaching schedule.*
The calendar view is read-only for teachers. Key dates are set by the Principal or Admin Officer during term setup. The calendar is also visible to Parents and Students.

---

## Epic US-SIS — Student Information System

**US-SIS-001: Submit a New Student Admission Application**
*As an Admin Officer, I want to register a new student applicant and record their details, so that the admissions pipeline can be progressed to a decision.*
The form captures the student's full name, date of birth, gender, intended class level, parent or guardian details, and any supporting documents. The application enters a pending status and is visible on the admissions dashboard. A reference number is generated for the applicant.

**US-SIS-002: Record an Admission Decision**
*As a Principal, I want to approve or decline an admission application, so that the student's status is formally updated and the family is notified.*
Approving an admission creates a student record and generates an offer letter that can be shared with the family. Declining records the reason and notifies the Admin Officer. The School Owner may be required to approve admissions depending on the workflow configuration.

**US-SIS-003: Enroll an Admitted Student in a Term**
*As an Admin Officer, I want to enroll an admitted student into a specific class arm for the current term, so that they appear in attendance, gradebook, and fee records.*
Enrollment requires selection of a class arm. The student is added to the class enrollment list. Their fee obligation is recorded. They are included in the billable count for the upcoming census lock.

**US-SIS-004: Initiate a Parent-Student Link**
*As an Admin Officer, I want to initiate the process of linking a parent to their child's record, so that the parent can access the child's academic and financial information.*
Initiating a link requires the parent's name, email address, phone number, and stated relationship to the student. An OTP invitation is sent to the parent's email. The link remains in pending status until the parent verifies their identity by completing the OTP flow. The Admin Officer cannot complete the link on behalf of the parent.

**US-SIS-005: Accept a Parent-Student Link**
*As a Parent, I want to verify my identity and accept the link to my child's school record, so that I can access their information on the platform.*
The parent receives an email containing a link and an OTP. They complete verification using either the link or the OTP. Successful verification activates the parent-student link. The Admin Officer receives a notification that the link is active.

**US-SIS-006: Transfer a Student Out**
*As an Admin Officer, I want to process a student transfer out, so that a transfer certificate is generated and the student's enrollment at the school is formally ended.*
The transfer workflow requires the destination school name or unknown if the destination is not on the platform, and the reason for transfer. The Principal approves the transfer. On approval, a transfer certificate is generated, the student's enrollment status is updated, and the student is removed from future term enrollment.

**US-SIS-007: View a Student's Full Profile**
*As a Principal, I want to view a student's complete profile including academic history, attendance, fee status, and parent links, so that I have a single source of truth for each student.*
The student profile page aggregates data from all modules. The Principal can see historical enrollment records, term-by-term results, attendance summaries, outstanding fee balances, and the parent-student link verification status.

---

## Epic US-ACA — Academic Management

**US-ACA-001: Build and Publish a Grading Scheme**
*As an Exam Officer, I want to define a grading scheme for a class level and term by specifying assessment components and their weights, so that Teacher gradebook columns are automatically generated.*
The scheme builder shows a running weight total that must reach exactly one hundred percent before the scheme can be published. Pre-built templates are available as starting points. Once published, the scheme is locked for the term and cannot be edited. Teachers whose subjects fall under the scheme immediately see the corresponding score-entry columns in their gradebook.

**US-ACA-002: Enter Gradebook Scores**
*As a Teacher, I want to enter scores for each assessment component for students in my assigned subjects, so that the gradebook reflects each student's performance.*
A Teacher can only enter scores for subjects they are currently assigned to in the current term. The gradebook shows one column per scheme component. The system automatically computes the weighted total when all components are entered. A Teacher cannot submit scores that exceed the maximum defined for a component.

**US-ACA-003: Request a Grade Correction**
*As a Teacher, I want to submit a grade correction request for a score I entered incorrectly after the gradebook was locked, so that the student's result reflects the correct information.*
The correction request captures the original value, the corrected value, and the reason. The Exam Officer reviews and approves or rejects the correction. If the Exam Officer is inactive for more than seventy-two hours, the Deputy Exam Officer is activated automatically. If approved, the Principal signs off before the corrected value is applied. The correction log records all values: original, corrected, requester, and both approvers.

**US-ACA-004: Publish Term Results**
*As an Exam Officer, I want to publish the final result set for a term, so that students and parents can view results and report cards become available.*
Before publishing, the Exam Officer confirms that all gradebook entries are locked and complete. Publishing makes results visible to Students and Parents immediately. Published results cannot be unpublished; corrections go through the grade correction workflow.

**US-ACA-005: Mark Daily Attendance**
*As a Class Teacher, I want to mark attendance for each student in my class every school day, so that the school has an accurate record of student presence.*
The attendance screen shows the class list. Each student can be marked present, absent, or late. The Class Teacher can mark attendance offline on mobile and sync when connectivity is restored. Offline entries are signed with a per-tenant device key. Once a day's attendance is submitted it can be amended only within the same day and amendments are logged.

**US-ACA-006: Create and Assign a Timetable**
*As a Timetable Officer, I want to build a class timetable by assigning subjects and teachers to periods, so that the schedule is visible to all parties.*
The timetable builder detects teacher conflicts — the same teacher assigned to two classes at the same time — and prevents saving a conflicting schedule. The published timetable is visible to Teachers, Students, and Parents.

**US-ACA-007: Create and Manage Assignments**
*As a Teacher, I want to create an assignment for a class with a due date, description, and maximum score, so that students know what work is expected and I can record their grades.*
Assignments are linked to a subject and class. Students see the assignment in their portal. Teachers record grades against individual submissions. Late submissions are flagged automatically after the due date.

---

## Epic US-FIN — Financial Management

**US-FIN-001: Configure the Fee Structure for a Term**
*As an Accountant, I want to set up the fee structure for each class level for the current term, so that invoices reflect the correct amounts.*
The fee structure lists one or more named fee items (for example tuition, development levy, uniform) with individual amounts. Different class levels can have different structures. Once a term opens, the fee structure can be amended only with Principal approval and the amendment is logged.

**US-FIN-002: Log an Offline Payment**
*As a Cashier, I want to log a cash or bank transfer payment received from a parent, so that the payment is recorded and a receipt is generated.*
The Cashier enters the student name, amount, payment date, payment method, and channel reference. A provisional receipt is generated. The payment enters an unverified status. The Cashier who logged the payment cannot access the verification step for that same payment.

**US-FIN-003: Verify an Offline Payment**
*As an Accountant, I want to verify offline payments logged by Cashiers, so that the payment is reconciled against bank records and marked as settled.*
Verified payments are applied against the student's outstanding fee obligations. Where the payment also covers PSF, the corresponding PSF obligation is marked as settled. Unverified payments cannot settle PSF obligations. Bank statement upload with automated matching assists the Accountant in bulk verification.

**US-FIN-004: Pay School Fees Online**
*As a Parent, I want to pay my child's school fees through the platform using a card or bank transfer, so that payment is instantly confirmed without visiting the school.*
The parent selects a child, views the outstanding fee items for the current term, and selects a payment amount and gateway. On successful payment, a receipt is generated and the fee obligation is updated. A push notification and email are sent to the parent. The PSF settlement is triggered automatically upon payment confirmation.

**US-FIN-005: View Outstanding Fee Balances**
*As an Accountant, I want to view outstanding fee balances for all students in the current term, filtered by class level and payment status, so that I can identify families with overdue payments.*
The outstanding balances view shows the total charged, total paid, and total balance per student. The list can be exported as a report. Sensitive student financial data is accessible only to the Accountant and Principal within the tenant.

**US-FIN-006: Initiate and Approve a Refund**
*As a Cashier, I want to initiate a refund request when a duplicate or erroneous payment is identified, so that the parent receives their money back through the correct process.*
The Cashier selects the payment, states the refund amount, and provides a reason. The refund request enters the approval workflow. The Accountant, then the Principal, and then the School Owner approve in sequence. On final approval, a negative transaction is posted to the ledger, a notification is sent to the parent, and the PSF settlement is reviewed for potential reversal if applicable.

**US-FIN-007: Reconcile Payments with the Gateway**
*As a Platform Administrator, I want the system to run a nightly reconciliation job that compares gateway settlement records against internal payment records, so that discrepancies are flagged before they accumulate.* **[Rev Int]**
The reconciliation job runs automatically every night. Discrepancies — payments recorded in the gateway but missing from the platform, or platform records with no matching gateway settlement — are listed in a reconciliation exceptions report. Each exception requires a manual resolution action by the Accountant or Platform Administrator depending on scope.

---

## Epic US-COM — Communication

**US-COM-001: Send a School-Wide Announcement**
*As a Principal, I want to broadcast an announcement to all staff, students, and parents within the school, so that important information reaches everyone immediately.*
Announcements are pushed as in-app notifications and optionally as email or SMS. The announcement is stored in the notification history for each recipient. Principals and School Owners can broadcast to all users. Admin Officers can broadcast to staff and parents. The sender and timestamp are recorded on every announcement.

**US-COM-002: Send a Class-Level Message**
*As a Class Teacher, I want to send a message to all parents of students in my class, so that I can share class-specific updates and progress notes.*
The Class Teacher selects their assigned class arm and composes the message. It is delivered to all verified parent accounts linked to students in that class. Parents can reply directly to the Class Teacher. Message history is stored per Class Teacher and per parent.

**US-COM-003: Receive and Reply to Messages as a Parent**
*As a Parent, I want to receive messages from my children's schools and reply to Class Teachers, so that I stay engaged in my children's academic life.*
Messages from all linked schools are aggregated in a single communication hub, separated by school. The parent can reply to the originating Class Teacher. Parents cannot initiate unsolicited messages to school staff — they can only reply to received messages. Communication from parents goes directly to the Class Teacher of the relevant student.

**US-COM-004: Send and Receive Notifications on Mobile**
*As any authenticated mobile user, I want to receive push notifications for important events — new results, payment confirmations, fee due reminders, and new announcements — so that I am informed in real time without opening the app.*
Push notifications are sent via the platform's notification service. Each notification links to the relevant screen in the app. Notification preferences can be configured per user. Critical notifications — payment confirmations, census lock alerts, MFA challenge requests — cannot be disabled.

---

## Epic US-PAR — Parent Portal

**US-PAR-001: View a Multi-Child Dashboard**
*As a Parent, I want a single dashboard showing all my linked children across all their schools, so that I can see their overall status at a glance.*
The dashboard shows each child's name, school, current class, most recent attendance, most recent result, and outstanding fee balance. Each child is presented as a separate card. Tapping a card navigates to the full profile for that child. All data is fetched via separate tenant-scoped queries — no cross-tenant data is exposed in a single query.

**US-PAR-002: Track a Child's Attendance**
*As a Parent, I want to see my child's attendance record for the current term, so that I know if they are attending school regularly.*
The attendance view shows a day-by-day record for the current term with status (present, absent, late). Monthly and term-to-date summaries are shown. Absences trigger a push notification to the parent on the day.

**US-PAR-003: View and Download a Child's Result**
*As a Parent, I want to view and download my child's term result and report card, so that I have an official record of their academic performance.*
Published results are visible in the parent portal immediately after the Exam Officer publishes them. Report cards are downloadable as PDF documents with the school's branding. Results from prior terms are retained and accessible in the term history view.

**US-PAR-004: Track Fee Status and Pay Online**
*As a Parent, I want to see the outstanding fees for each of my children and pay directly through the platform, so that I can manage all school payments from one place.*
Each child's fee tab shows the current term fee structure, amounts paid, and outstanding balance. The parent can pay for one or more children in a single session. After payment, a receipt is immediately available in the portal and an email confirmation is sent.

**US-PAR-005: Update Contact Details**
*As a Parent, I want to update my phone number or email address, so that I continue to receive important school communications.*
Changing an email address requires MFA verification and a cooling-off period before the change takes effect. During the cooling-off period, the parent receives a notification at both the old and new contact details. Changing a phone number also requires OTP verification at the new number.

---

## Epic US-STU — Student Portal

**US-STU-001: View Personal Results and Report Card**
*As a Student, I want to see my current term results and download my report card, so that I have an official record of my academic performance.*
The student can only see their own results. Results are visible only after the Exam Officer publishes them. Historical results from prior terms are accessible in the term history view.

**US-STU-002: View the Class Timetable**
*As a Student, I want to see my class timetable for the current term, so that I know when each subject is scheduled.*
The timetable view is read-only. Updates made by the Timetable Officer are reflected immediately.

**US-STU-003: Submit an Assignment**
*As a Student, I want to submit an assignment created by my Teacher, so that my work is recorded and my grade is captured against my profile.*
The student sees all active assignments for their enrolled subjects. Submitting an assignment attaches the file or text and records the submission timestamp. Late submissions are flagged but still accepted unless the teacher has closed the submission window.

**US-STU-004: Track Personal Attendance**
*As a Student, I want to view my own attendance record for the current term, so that I can monitor my presence and identify any unmarked absences to raise with the Class Teacher.*
The attendance view shows the same data the parent sees for the student — day-by-day status. The student cannot edit attendance records.

---

## Epic US-WRK — Workflow and Approval Engine

**US-WRK-001: Configure a Workflow Template**
*As a Platform Owner or Platform Administrator, I want to configure standard workflow templates — such as the number of approvers and the escalation path for refunds — so that the approval process is consistent across all tenants.*
Workflow templates define the approver chain by role, the escalation rules, and the timeout behaviour. Tenant administrators can choose from available templates. Some workflows are mandatory and cannot be disabled.

**US-WRK-002: View and Act on Pending Approval Tasks**
*As any user with an approver role, I want to see all workflow tasks that require my action, so that I can approve, reject, or return items without missing time-sensitive decisions.*
The task inbox shows each pending item with its type, the initiator, the date submitted, and the deadline if applicable. Approving or rejecting an item records the decision with the actor and timestamp and moves the workflow to the next step or closes it. Email notifications are sent when a new task enters a user's inbox.

**US-WRK-003: Track the Status of a Submitted Request**
*As a request initiator, I want to see the current status and approval history of a workflow I submitted, so that I know where it stands and who is responsible for the next action.*
The request detail view shows the full approval chain, the current step, all prior decisions with actors and timestamps, and the current holder's name and expected response time.

---

## Epic US-AUD — Audit and Compliance

**US-AUD-001: Search and Export the Audit Log**
*As a Platform Owner, I want to search the audit log by actor, tenant, action type, date range, and sensitivity level, so that I can investigate any specific event.*
The audit log is immutable — no record can be deleted or edited through any interface. Search results can be exported. All export actions are themselves logged as data access events. Sensitive filter combinations — for example all privileged changes by a specific admin — generate an alert for the Platform Owner.

**US-AUD-002: Manage a Data Subject Access Request (DSAR)**
*As the Data Protection Officer, I want to receive, process, and respond to DSARs from parents, students, and staff within the legally required timeframe, so that the platform meets its NDPA 2023 obligations.*
The DSAR queue shows each request with the requester, the data categories requested, the date received, and the response deadline. The DPO can retrieve the relevant data, review it for third-party information that must be redacted, and mark the request as responded. Overdue DSARs generate escalation alerts.

**US-AUD-003: Manage a Data Breach**
*As the Data Protection Officer, I want to record, assess, and report a data breach, so that the NDPC is notified within seventy-two hours if required.*
The breach record captures the date of discovery, the type and scope of data affected, the affected data subjects, the likely cause, and the containment measures taken. The DPO determines whether NDPC notification is required. If required, the platform generates a pre-filled notification draft based on the breach record. The outcome of the notification is recorded.

**US-AUD-004: Access the Tenant Audit Trail**
*As a School Owner, I want to view all significant events within my school — login events, payment posts, role changes, census lock actions — so that I have a local audit trail for internal accountability.*
The school-scoped audit log shows events relevant to the tenant. The School Owner and Principal can view the log but cannot alter it. The log can be filtered by event type, actor, and date range.

**US-AUD-005: Review NDPA Compliance Status**
*As the Data Protection Officer, I want to view the platform's current compliance posture — data retention policies, consent records, active DSARs, breach history — on a single dashboard, so that I can maintain an ongoing record of processing activities.*
The compliance dashboard is read-only for all roles except the DPO, who can update retention policy configurations and consent templates. All changes to compliance configuration are audit-logged.

---

## Epic US-REV — Revenue Integrity and Fraud Prevention

**US-REV-001: View the PSF Obligation Ledger for My School**
*As a School Owner, I want to view all PSF obligations created for my school — per student, per term — and their settlement status, so that I understand exactly what the platform has billed and what is outstanding.* **[Rev Int]**
The PSF ledger shows each obligation with the student name, term, obligation amount, amount settled, and current status. Obligations are read-only — neither the School Owner nor any school staff can modify them. Disputed items are flagged separately. Waived items show the waiver reason and approving authority.

**US-REV-002: View the Enrollment Attestation History**
*As a School Owner, I want to view all census lock attestations I or the Principal have signed, so that I have a record of every declaration I have made to the platform.* **[Rev Int]**
The attestation history shows the attester's name and role, the term, the attested student count, the timestamp, and the digital signature reference. Records are permanent and cannot be deleted.

**US-REV-003: Respond to an IVP Anomaly Alert**
*As a School Owner, I want to receive an alert when the platform's Independent Verification Pipeline flags a potential enrollment discrepancy, so that I can provide additional documentation before the case escalates.* **[Rev Int]**
The alert shows the estimated enrollment range from IVP signals versus the attested count and the anomaly score. The School Owner can upload supporting documentation — class registers, timetable photos — as part of their response. The response is forwarded to the assigned Platform Administrator investigator. Referral earnings for the tenant are held during an active IVP case.

**US-REV-004: View the Platform Ledger (Double-Entry)**
*As a Platform Owner, I want to view the immutable double-entry ledger showing all platform-level financial movements, so that I can verify the integrity of all revenue records.* **[Rev Int]**
The ledger shows each entry with the transaction group, account code, direction (debit or credit), amount, source type, and source reference. Balanced transaction pairs are displayed together. No manual adjustment can be made through the ledger view — all adjustments require a separate privileged workflow with dual approval.

**US-REV-005: Waive a PSF Obligation**
*As a Platform Administrator, I want to request a waiver for a PSF obligation in documented exceptional circumstances, so that the school is not billed for a student under specific approved conditions.* **[Rev Int]**
A waiver request requires the obligation identifier, the reason category, and a written justification. A second Platform Administrator must approve. On approval, the obligation status is set to waived and the amount is recorded in the revenue lost to waivers report. The waiver cannot be reversed after approval.

**US-REV-006: Request an Enrollment Recount**
*As a Platform Administrator, I want to trigger a formal recount request to a tenant when IVP signals indicate a high probability of underreporting, so that the school submits a revised attestation if warranted.* **[Rev Int]**
The recount request is logged against the IVP anomaly case. The School Owner receives a formal notification requiring a response within a defined window. Failure to respond within the window escalates the case to Platform Owner level.

---

## Epic US-REF — Referral Programme Management

**US-REF-001: Complete KYC Verification**
*As a Regional Manager, I want to submit my KYC documents and conflict-of-interest declaration so that my referral code is activated and I can begin earning.*
The KYC form captures identity documents, address proof, and answers to conflict-of-interest questions. Submission creates a pending KYC record visible to Platform Operations. A Regional Manager cannot approve their own or their direct subordinates' KYC. Approval activates the referral code. Rejection records the reason and notifies the applicant.

**US-REF-002: View My Referral Code**
*As a Regional Manager, I want to securely view my referral code so that I can share it during school onboarding.*
The referral code is displayed exactly once when it is first generated, at code activation. It is never stored in plain text by the platform. After the initial display, the Regional Manager can regenerate the code — which invalidates the old code — but cannot retrieve the previous code. A new code generation is audit-logged.

**US-REF-003: Monitor Referral Attribution**
*As a Platform Administrator, I want to view the full referral attribution map showing which schools are attributed to which participants, so that earning calculations are transparent and auditable.*
The attribution map shows the chain from tenant to referral code to participant to manager. Attribution created through self-referral or undisclosed beneficial ownership is flagged. Flagged attributions trigger an earnings hold and a forfeiture review.

**US-REF-004: Check the Forty Percent Payout Cap**
*As a Platform Administrator, I want the system to automatically enforce the forty percent payout cap per tenant per cycle, so that platform revenue is never diluted beyond the acceptable threshold.* **[Rev Int]**
The cap is computed per payout cycle per tenant. When the cap is reached, excess earnings are held to the next cycle rather than paid out. The cap status is visible to both the Platform Owner and the earning participant. The calculation is based only on settled, non-disputed PSF obligations.

---

## Epic US-HRM — Human Resources and Staff Management

**US-HRM-001: Onboard a New Staff Member**
*As an Admin Officer, I want to create an account for a new teacher or administrative staff member and send them an invitation to join, so that they can access the system under the correct role.*
The onboarding form captures the staff member's full name, personal email, phone number, and the role to assign. An invitation email with a one-time setup link is sent. The link expires after forty-eight hours. The staff member's account is in pending status until they complete setup. The Admin Officer cannot complete the setup on behalf of the staff member.

**US-HRM-002: Assign a Subject to a Teacher**
*As a Principal, I want to assign specific subjects in specific class arms to a Teacher for the current term, so that they have the correct gradebook access.*
The assignment screen shows all Teachers, all subjects offered, and all class arms. A Teacher can be assigned to multiple subjects across multiple class arms. Assignments take effect immediately. The Teacher is notified of their new assignment. Removing an assignment mid-term requires Principal approval, is audit-logged, and removes write access while preserving existing entries.

**US-HRM-003: Assign a Class Teacher to a Class Arm**
*As a Principal, I want to designate one Teacher as the Class Teacher for a specific class arm for the current term, so that they can mark attendance and communicate with parents.*
Only one Class Teacher can be active per class arm per term. If the Class Teacher is reassigned mid-term, the system prompts confirmation and notifies both the previous and the new Class Teacher. The previous Class Teacher's attendance access is revoked. All prior attendance records they submitted are preserved.

**US-HRM-004: Change a Staff Member's Role**
*As a School Owner, I want to change the primary role of a staff member — for example promoting an Admin Officer to Principal — so that their system access reflects their new responsibilities.*
Role changes require School Owner approval. The change is audit-logged with the old role, the new role, the approver, and the effective timestamp. The staff member's existing sessions are immediately invalidated. They must log in again to access the system under their new role.

**US-HRM-005: Deactivate a Staff Member**
*As a Principal, I want to deactivate a staff account when a staff member leaves the school, so that they can no longer access the system.*
Before confirming deactivation, the system checks whether the staff member holds a singleton critical role — Exam Officer or Accountant — with no deputy. If so, a warning is shown requiring the Principal to confirm a deputy is available or assign a replacement. On deactivation, all active sessions are immediately revoked and all historical records are preserved. The deactivation is audit-logged.

**US-HRM-006: View the Staff Directory**
*As a Principal, I want to see a full list of all active, pending, and deactivated staff members with their roles and assignment histories, so that I have a complete operational picture of the school's personnel.*
The directory shows each staff member's name, role, current assignments, account status, and employment dates. Tapping a staff member opens their full profile with the complete assignment and role change history. Deactivated staff members are shown in a separate filtered view and are never deleted from the directory.

**US-HRM-007: Update Personal Contact Details**
*As a Teacher, I want to update my phone number and notification preferences, so that I receive communications on my current contact details.*
Teachers and Class Teachers can update their own phone number and notification preferences. They cannot change their own email address or role without going through the approval workflow. Changes to phone numbers are logged.

**US-HRM-008: Manage Active Sessions and Registered Devices**
*As any authenticated user, I want to view all my active sessions and registered devices, and revoke any session or device I do not recognise, so that I can protect my account from unauthorised access.*
The security settings page lists each active session with its device type, approximate location, and last active timestamp. Each session can be individually revoked. Registered devices eligible for persistent MFA tokens are listed separately and can be deregistered. Deregistering a device immediately invalidates its persistent token and forces a full MFA challenge on the next login from that device.

**US-HRM-009: Resend an Expired Staff Invitation**
*As an Admin Officer, I want to resend an invitation link to a staff member whose original link expired, so that they can still complete their account setup.*
The staff directory shows pending accounts with their invitation expiry status. The Admin Officer can trigger a new invitation for any pending account. The previous link is immediately invalidated. A new forty-eight-hour link is sent to the staff member's email. This action is audit-logged.

---

## Appendix: Cross-Cutting Stories

**US-XC-001: Log In with MFA**
*As any user whose role requires MFA, I want to complete a two-step login — password followed by TOTP — so that my account is protected from password-only compromises.*
On first login after account creation, the user is blocked until they configure an authenticator app and complete their first MFA challenge. Failure to configure MFA keeps the account locked. From the second login onwards, the user must supply both their password and a valid TOTP code. More than five failed login attempts within ten minutes triggers account lockout and an email notification.

**US-XC-002: Use Biometric Login on Mobile**
*As a mobile user who has previously logged in with password and MFA, I want to use Face ID or fingerprint to log in on subsequent sessions, so that I can access the app quickly.*
Biometric authentication is available only after the initial full login is completed on the device. The biometric prompt replaces the password and MFA entry for subsequent sessions on the same device. The underlying session is still bound by the idle and absolute timeout rules.

**US-XC-003: Reset a Forgotten Password**
*As any user, I want to reset my password via OTP sent to my registered email or phone, so that I can regain access to my account without contacting support.*
The reset flow sends an OTP to the user's registered contact. Successful OTP verification allows the user to set a new password. After reset, all existing sessions except the one on the current device are immediately invalidated. The reset event is audit-logged.

**US-XC-004: Perform Step-Up MFA for a High-Risk Action**
*As an authorised user, I want to be prompted for a fresh MFA challenge before completing a high-risk action — such as data export, result publishing, or PSF rate change — so that a compromised session cannot perform irreversible operations without re-authentication.*
The step-up prompt appears regardless of how recently the user last authenticated. The challenge uses the same TOTP method configured for the account. Biometric step-up is not permitted for high-risk actions on mobile — the full TOTP code is required.

**US-XC-005: Receive Notification of Session Displacement**
*As any user, I want to be notified when one of my existing sessions is terminated because I reached the concurrent session limit and opened a new one, so that I am aware of where I am logged in.*
When a sixth session is opened, the oldest existing session is revoked. The owner of the revoked session receives an email notification stating that one of their sessions was closed due to the concurrent session limit and listing the device type and last active timestamp of the displaced session.

---

*Loomis User Stories v1 — aligned to Loomis SRS v3 (10 June 2026). Story identifiers correspond to SRS functional modules. All stories are subject to the security, data isolation, and audit requirements defined in SRS v3 Sections 7 through 9.*
