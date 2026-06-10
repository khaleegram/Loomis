# Loomis Platform — Page Specification Document

**Purpose:** Handoff document for Figma designers. Describes every page in the platform — what it is, who uses it, what they can do, and what user stories it fulfills. No code. No design decisions. No components. No colours. Just what each page does.

**Date:** 09 June 2026
**References:** Loomis SRS v3, Loomis User Stories v1

---

## AUTH PAGES

### Login Page
**Route:** `/login`
**Who uses it:** All users
**User stories:** US-XC-001

This is the first page anyone sees when they are not logged in. The user enters their email address and password. After successful login, users whose role requires MFA are taken to the MFA page. Users without MFA go straight to their dashboard. If the user has forgotten their password, a link takes them to the password reset flow. More than five failed attempts within ten minutes locks the account and sends an email notification.

### MFA Verification Page
**Route:** `/mfa`
**Who uses it:** All users whose role requires MFA
**User stories:** US-XC-001

After entering the correct password, the user must enter a six-digit code from their authenticator app. The page shows a countdown timer for the code's validity period. Users who cannot access their authenticator app are directed to account recovery. This page is also shown during step-up MFA challenges for high-risk actions (US-XC-004).

### MFA Setup Page
**Route:** `/mfa-setup`
**Who uses it:** All new users whose role requires MFA
**User stories:** US-XC-001

On first login, users whose role requires MFA are blocked from all other pages until they set up their authenticator app. This page shows a QR code to scan and a manual entry key. The user must enter a verification code to confirm setup is complete before proceeding to their dashboard.

### Password Reset Page
**Route:** `/reset-password`
**Who uses it:** Any user who forgot their password
**User stories:** US-XC-003

The user enters their registered email address. An OTP is sent to that email. After verifying the OTP, the user sets a new password. On completion, all existing sessions except the current one are invalidated and the user is logged in with the new password.

---

## PLATFORM CONSOLE PAGES

The Platform Console is used by the Platform Owner, Platform Administrator, and Data Protection Officer. These are the people who run the entire Loomis platform across all schools.

### Platform Dashboard
**Route:** `/platform/dashboard`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-PLT-005, FR-PLT-005

This is the home screen for the platform operations team. It gives an instant picture of the health of the entire platform. The user sees the total number of active schools, how much PSF revenue has been billed, how much has been settled, and how much is still outstanding. These numbers show whether revenue is trending up or down compared to the previous period. There is a chart showing earnings over time so the user can spot growth patterns or concerning dips. The page also surfaces things that need attention — pending approval requests from other administrators, open IVP anomaly cases that need investigation, and overall platform activity status. A quick actions area lets the user jump directly to managing tenants, configuring PSF rates, reviewing approvals, or investigating risk cases.

### Tenants Page
**Route:** `/platform/tenants`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-PLT-001, US-PLT-002

A searchable, filterable list of every school on the platform. Each row shows the school name, region, current tier, PSF rate, number of students, and account status. From here the user can create a new school tenant, open a school's detail page, or suspend a school. Suspension immediately blocks all school logins while keeping all data intact. The user can also reinstate a previously suspended school.

### New Tenant Page
**Route:** `/platform/tenants/new`
**Who uses it:** Platform Administrator
**User stories:** US-PLT-001

A form to provision a brand new school on the platform. The form captures the school name, physical address, primary contact email, region assignment, platform tier, and a referral code. The referral code determines who gets credit for bringing the school onto the platform. On submission, the system creates the isolated school environment and sends an invitation to the School Owner. The entire provisioning event is recorded in the audit log.

### Tenant Detail Page
**Route:** `/platform/tenants/[id]`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-PLT-002, US-PLT-005

A detailed view of a single school's configuration and status. Shows the school's profile information, current PSF rate, enrollment history across terms, PSF obligation and settlement summary, active staff roles, and any open support tickets or IVP cases. From here the user can suspend or reinstate the tenant, adjust the PSF rate (with dual approval), activate break-glass support access, or view the full audit trail for this school.

### PSF Rates Page
**Route:** `/platform/psf`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-PLT-003, US-PLT-004

This page manages how much each school pays the platform per student. It shows the global default PSF rate and lists any schools that have custom override rates. The user can change the global default rate (requires step-up MFA and is permanently logged). They can also submit a request for a per-school rate override, which another administrator must approve. All rate changes — old value, new value, who requested, who approved — are permanently recorded. A rate of zero can never be set.

### Ledger Page
**Route:** `/platform/ledger`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-REV-004

This is the immutable double-entry ledger — the financial system of record for the entire platform. Every PSF obligation created, every settlement received, every refund processed, every referral payout disbursed, and every manual adjustment appears here as balanced debit and credit entries. The user can search by date range, tenant, transaction type, or amount. Nothing on this page can be edited or deleted. Errors are corrected only by creating a new adjusting entry, which itself requires two-person approval. A nightly balance check verifies that everything nets to zero.

### Approvals Page
**Route:** `/platform/approvals`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-PLT-004, FR-PLT-007, US-WRK-002

This is the approval queue for all high-risk platform actions. Each item shows what change is being requested, who requested it, the affected school or configuration, the before and after values, and the justification. The user can approve or reject each request. A user can never approve their own request. Every decision is permanently logged. Items include PSF rate override requests, PSF waiver requests, ledger adjustments, and referral rule changes.

### Risk Cases Page
**Route:** `/platform/risk`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-PLT-007, US-REV-003

This page lists all active IVP (Independent Verification Pipeline) anomaly cases. The Independent Verification Pipeline compares what each school reports as its enrollment against what the platform can independently observe — payment volumes, attendance records, gradebook entries, active classes, parent logins, and assignment submissions. Each case shows the school name, the anomaly score (how big the discrepancy is), the school's reported enrollment versus the platform's estimate, which signals triggered the alert, and the current case status. The user can assign cases to investigators, track investigation progress, and record resolution outcomes. Active IVP cases block referral payouts for the affected school.

### Risk Case Detail Page
**Route:** `/platform/risk/[id]`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-PLT-007, US-REV-003

A deep-dive view into a single IVP anomaly case. Shows all seven signal snapshots (payment volume, attendance records, gradebook entries, class count, parent accounts, assignment submissions, and reported enrollment) over time so the investigator can see exactly where the discrepancy lies. The user can request a formal recount from the school, record investigation notes, upload supporting documents, and close the case with a resolution summary.

### Referrals Page
**Route:** `/platform/referrals`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-REF-003, US-REF-004, FR-REF-004

This page manages the referral programme. It shows all referral participants — Regional Managers and their Subordinates — with their KYC status, active status, and total earnings. The attribution map shows which schools are linked to which referral codes. The user can view and configure referral programme rules: what percentage each participant earns, the payout schedule, and the 40% per-tenant payout cap. Flagged attributions (self-referral or undisclosed beneficial ownership) are highlighted for review.

### KYC Verifications Page
**Route:** `/platform/referrals/kyc`
**Who uses it:** Platform Owner, Platform Administrator
**User stories:** US-REF-001

This page lists all referral participants awaiting KYC verification. Each item shows the participant's name, submitted identity documents, conflict-of-interest declaration, and submission date. The user can review the documents, approve or reject the verification, and record the reason for rejection. A participant cannot earn referral income until their KYC is approved. A Regional Manager cannot approve their own or their subordinates' KYC.

### Compliance Posture Page
**Route:** `/platform/compliance`
**Who uses it:** Data Protection Officer, Platform Owner, Platform Administrator
**User stories:** US-AUD-005

This is the compliance dashboard. It shows the current NDPA compliance posture at a glance: number of active Data Subject Access Requests and their response deadlines, recent breach records, data retention policy status, consent records overview, and a summary of recent processing activities. The DPO uses this as their home screen to stay on top of all compliance obligations.

### DSAR Queue Page
**Route:** `/platform/compliance/dsar`
**Who uses it:** Data Protection Officer
**User stories:** US-AUD-002

This page manages Data Subject Access Requests — formal requests from parents, students, or staff to see what personal data the platform holds about them. Each request shows the requester's name, what data categories they asked for, the date received, and the response deadline. The DPO can retrieve the relevant data, review it for any third-party information that must be redacted, and mark the request as responded. Requests past their deadline generate escalation alerts.

### Breach Records Page
**Route:** `/platform/compliance/breaches`
**Who uses it:** Data Protection Officer
**User stories:** US-AUD-003

This page records and tracks data breaches. The DPO can create a new breach record capturing what was discovered, when, what type and scope of data was affected, how many people were affected, the likely cause, and what containment measures were taken. The system helps the DPO determine whether the breach requires NDPC notification within 72 hours and generates a pre-filled notification draft if required.

### Retention & Consent Page
**Route:** `/platform/compliance/retention`
**Who uses it:** Data Protection Officer
**User stories:** US-AUD-005

This page manages data retention policies and consent records. The DPO can review and update how long different types of data are kept before deletion or anonymisation. Active consent records from parents and staff are listed and searchable. Changes to retention policies are audit-logged.

### Audit Log Page
**Route:** `/platform/compliance/audit`
**Who uses it:** Platform Owner, Platform Administrator, Data Protection Officer
**User stories:** US-AUD-001

The full platform audit trail. Every significant action across the entire platform is recorded here immutably — login events, data access, financial operations, role changes, privileged actions, and configuration changes. The user can search by actor, tenant, action type, date range, and sensitivity level. Results can be exported. All export actions are themselves logged. Sensitive search combinations generate alerts. Nothing on this page can be edited or deleted.

### Settings Page
**Route:** `/platform/settings`
**Who uses it:** Platform Owner, Platform Administrator, Data Protection Officer
**User stories:** US-HRM-008, US-PLT-004

Platform-level configuration. The user can manage their own account security (view active sessions, revoke unknown sessions, deregister devices, change password, configure MFA), set notification preferences, and access platform feature flags and referral programme rules if authorised.

---

## REGIONAL CONSOLE PAGES

The Regional Console is used by Regional Managers and their Subordinates to monitor schools, onboard new schools, and track referral earnings.

### Regional Dashboard
**Route:** `/regional/dashboard`
**Who uses it:** Regional Manager, Regional Subordinate
**User stories:** US-REG-001, FR-REG-004

This is the home screen for the regional team. Regional Managers see aggregated data across all schools in their region — total schools, total students, enrollment trends, average attendance rates, and average fee collection rates. The dashboard shows how schools compare against each other on key performance metrics. A map view shows the geographic spread of schools. Regional Subordinates see a more focused version showing only the schools they personally manage. No individual student data is ever visible here — only aggregated numbers.

### Onboard School Page
**Route:** `/regional/onboarding`
**Who uses it:** Regional Manager, Regional Subordinate
**User stories:** US-REG-002, FR-REG-001

A form to submit a new school for onboarding. The Regional Manager or Subordinate completes the school details — name, address, contact information, and the intended platform tier. Their referral code is automatically attached to the submission. Once submitted, the request goes to Platform Administrators for processing. The user can track the status of their submitted onboardings and see when a school goes live.

### Subordinates Page
**Route:** `/regional/subordinates`
**Who uses it:** Regional Manager only
**User stories:** US-REG-003, FR-REG-002

This page lets Regional Managers manage the people working under them. They can create new subordinate accounts, view each subordinate's status and onboarding activity, and deactivate subordinates. Each subordinate gets a unique sub-code linked to the manager's referral chain. Subordinates cannot earn income until their KYC is approved by Platform Operations. The manager cannot approve their own subordinates' KYC.

### Referral Earnings Page
**Route:** `/regional/earnings`
**Who uses it:** Regional Manager, Regional Subordinate
**User stories:** US-REG-004, FR-REG-003

This page shows exactly how much referral income the user is earning and why. It breaks down earnings by school — showing how much PSF each school generated, what the user's share is, and whether any earnings are on hold due to disputes or IVP investigations. It shows the current payout cycle's accumulated total, the status of the next scheduled payout, and how close the user is to the 40% per-tenant payout cap. Historical payout records are available.

---

## SCHOOL CONSOLE PAGES

The School Console is used by everyone working within a single school — School Owner, Principal, Admin Officer, Accountant, Cashier, Exam Officer, Deputy Exam Officer, Timetable Officer, Teacher, and Class Teacher. Each role sees a different subset of pages based on what they are allowed to do.

### School Dashboard
**Route:** `/school/dashboard`
**Who uses it:** All school roles
**User stories:** US-ASM-007, US-SIS-005, US-ACA-010, FR-ACA-010

This is the home screen for everyone in the school. What you see depends on your role. A School Owner sees the big picture — total students, staff headcount, admissions pipeline status, fee collection rate, recent approvals waiting for their action, and overall school financial health. A Class Teacher sees their class attendance summary, student welfare flags, quick access to mark attendance and message parents, and a view of whether all subject teachers have completed their gradebooks. A Teacher sees their subject assignments, upcoming deadlines, and quick access to their gradebook. An Accountant sees fee collection status and payment verification queue. Every role gets the data most relevant to their daily work with quick actions to jump into their most frequent tasks. Below the dashboard, every role sees a grid of module cards linking to the pages they have access to.

### Staff Directory Page
**Route:** `/school/staff`
**Who uses it:** Principal, Admin Officer, School Owner
**User stories:** US-HRM-006, FR-HRM-007

A searchable list of every staff member in the school — active, pending (invited but not yet set up), and deactivated. Each person shows their name, role, current subject and class assignments, account status, and employment dates. Clicking a staff member opens their full profile with complete assignment history, role change history, and audit trail. From here the Principal can invite new staff, change someone's role, assign them to subjects or classes, designate them as a Class Teacher, or deactivate their account.

### Invite Staff Page
**Route:** `/school/staff/invite`
**Who uses it:** Principal, Admin Officer
**User stories:** US-HRM-001, FR-HRM-001

A form to bring a new person into the school. The user enters the person's full name, personal email, phone number, and the role they will have. On submission, an invitation email is sent with a one-time setup link that expires after 48 hours. The user can resend expired invitations from this page. The staff member's account stays in pending status until they complete setup themselves — the Admin Officer cannot do it for them.

### Staff Detail Page
**Route:** `/school/staff/[id]`
**Who uses it:** Principal, Admin Officer, School Owner
**User stories:** US-HRM-002, US-HRM-003, US-HRM-004, US-HRM-005, US-HRM-009, FR-HRM-002 through FR-HRM-006

A complete profile of a single staff member. Shows their name, current role, any role extensions (like Class Teacher), current subject and class assignments, account status, join date, and full assignment history. From here the Principal can change their role, add or remove the Class Teacher extension, assign them to subjects and class arms, designate them as exam officer deputy, or deactivate their account. If deactivating someone who holds a critical singleton role (like being the only Exam Officer), the system warns and requires confirmation that a replacement exists. All role changes, assignment changes, and deactivations are permanently logged.

### Students Page
**Route:** `/school/students`
**Who uses it:** Principal, Admin Officer, Accountant, School Owner
**User stories:** US-SIS-005, US-SIS-006, US-SIS-007, FR-SIS-005

A searchable list of all students in the school. Each row shows the student's name, admission number, current class, enrollment status, and whether their identity has been attested. The user can filter by class, status, or search by name. Clicking a student opens their full profile. From here the Admin Officer can process transfers out or initiate parent-student links.

### Student Detail Page
**Route:** `/school/students/[id]`
**Who uses it:** Principal, Admin Officer, Accountant, School Owner, Class Teacher
**User stories:** US-SIS-007, FR-SIS-007

A single student's complete profile — the single source of truth for everything about that student. Shows personal information, admission details, current enrollment, academic history across all terms, attendance summary, fee status and payment history, parent link status, and any uploaded documents. The page aggregates data from every module into one view. The Class Teacher sees a version focused on academic performance and attendance within their class.

### Admissions Page
**Route:** `/school/students/admissions`
**Who uses it:** Admin Officer, Principal, School Owner
**User stories:** US-SIS-001, US-SIS-002, FR-SIS-001

The admissions pipeline. Shows all student applications grouped by status — pending review, approved, declined. Each application shows the student's name, intended class, guardian details, and submission date. The Admin Officer creates new applications here. The Principal reviews pending applications and approves or declines them with a reason. Approved applications automatically create student records and generate offer letters. The pipeline shows conversion rates so the school can track how many applicants become enrolled students.

### New Admission Page
**Route:** `/school/students/admissions/new`
**Who uses it:** Admin Officer
**User stories:** US-SIS-001

A form to register a new student applicant. Captures the student's full name, date of birth, gender, intended class level, and guardian/parent details (name, email, phone, relationship). Supporting documents can be attached. On submission, the application enters pending status with a generated reference number and appears on the admissions dashboard.

### Academic Sessions Page
**Route:** `/school/sessions`
**Who uses it:** Principal, School Owner, Admin Officer
**User stories:** US-ASM-001 through US-ASM-008, FR-ASM-001 through FR-ASM-010

This is where the school's academic calendar is managed. It shows all academic years and their terms. The user can create a new academic year, activate it, configure each term's dates (start, end, enrollment window, census lock date), open terms to begin operations, and close terms when complete. The census lock screen is accessed from here — this is the critical moment where the School Owner or Principal formally attests to how many students are enrolled. On census lock, all PSF obligations for the term are automatically created. This page also handles student promotion at year end (moving students to the next class) and student graduation (marking final-year students as completed and generating leaving certificates). The academic calendar showing key dates like mid-term breaks and exam periods is configured here.

### Census Lock Page
**Route:** `/school/sessions/census-lock`
**Who uses it:** School Owner, Principal
**User stories:** US-ASM-003, FR-SIS-006

One of the most important pages in the system. The School Owner or Principal reviews the current billable student count broken down by class level. The system shows the Minimum Term Commitment for comparison. If the count is below the MTC, a warning is shown and confirmation is required. The user must complete a step-up MFA challenge before locking the census. Once locked, the census cannot be changed and PSF obligations are created for every billable student. This action creates a digitally signed attestation record that is permanent.

### Timetable Page
**Route:** `/school/timetable`
**Who uses it:** Timetable Officer, Principal
**User stories:** US-ACA-006, FR-ACA-001

The timetable builder. The Timetable Officer assigns subjects and teachers to time periods for each class. The system automatically detects conflicts — the same teacher assigned to two classes at the same time — and prevents saving a conflicting schedule. Once published, the timetable is visible to Teachers, Class Teachers, Students, and Parents.

### Assignments Page
**Route:** `/school/assignments`
**Who uses it:** Teacher, Student (via portal)
**User stories:** US-ACA-007, US-STU-003, FR-ACA-003

Teachers create assignments here — title, description, due date, maximum score, and any attached resources. They can see all assignments they have created across their classes. Students see a read-only version showing only assignments for their enrolled subjects with submission status and deadlines.

### Finance Page
**Route:** `/school/finance`
**Who uses it:** Accountant, Principal, School Owner
**User stories:** US-FIN-001, US-FIN-005, FR-FIN-001

The financial management hub. Shows fee structures configured for each class level and term, the current term's billing status, and overall financial health. The Accountant sets up fee structures here — naming each fee item (tuition, development levy, uniform, etc.) and its amount per class level. Once a term opens, fee structures can be amended only with Principal approval and the amendment is logged.

### Payments Page
**Route:** `/school/finance/payments`
**Who uses it:** Accountant, Cashier, Principal
**User stories:** US-FIN-002, US-FIN-003, US-FIN-004, FR-FIN-004

A list of all payments received. Shows each payment's student, amount, date, method (online, cash, bank transfer, POS), and status (verified or unverified). The Accountant verifies offline payments here — reviewing the evidence the Cashier attached and confirming the payment against bank records. A Cashier can log payments but cannot verify them. Online payments through the payment gateway are automatically verified.

### Log Payment Page
**Route:** `/school/finance/payments/log`
**Who uses it:** Cashier
**User stories:** US-FIN-002

A form for recording offline payments. The Cashier enters the student name, amount paid, payment date, method (cash or bank transfer), and attaches evidence like a receipt image or bank slip. On submission, a provisional receipt is generated and the payment enters unverified status awaiting Accountant review.

### Verify Payments Page
**Route:** `/school/finance/payments/verify`
**Who uses it:** Accountant
**User stories:** US-FIN-003

The Accountant reviews offline payments logged by Cashiers. Each payment shows the student, amount, payment evidence, and how long it has been waiting. The Accountant can verify payments individually or use bank statement upload for bulk matching. Verified payments are applied against the student's outstanding fee obligations and their PSF obligation is settled proportionally. Payments unverified for more than three days generate alerts. Payments unverified for seven days block term closure.

### Outstanding Balances Page
**Route:** `/school/finance/balances`
**Who uses it:** Accountant, Principal, School Owner
**User stories:** US-FIN-005

A report showing every student's fee status for the current term — how much was charged, how much has been paid, and how much is still outstanding. The list can be filtered by class level and payment status. The Accountant can export this as a report. This page is used to identify families with overdue payments.

### Refunds Page
**Route:** `/school/finance/refunds`
**Who uses it:** Cashier, Accountant, Principal, School Owner
**User stories:** US-FIN-006, FR-FIN-007

Manages refund requests. A Cashier initiates a refund by selecting the original payment, stating the refund amount, and providing a reason. The refund then goes through approval — Accountant, then Principal, then School Owner in sequence. On final approval, the refund is processed, the parent is notified, and a negative transaction is posted to the ledger. A refund does not automatically reverse the PSF — PSF reversal is only allowed in specific cases (duplicate payment, platform error, chargeback) and requires Platform Operations approval.

### PSF Obligations Page
**Route:** `/school/finance/psf`
**Who uses it:** School Owner, Accountant
**User stories:** US-REV-001, US-REV-002, FR-REV-001

This page shows exactly what the school owes the platform. Every PSF obligation is listed — per student, per term — with the obligation amount, how much has been settled, and current status. Obligations are read-only — no school staff can modify them. The School Owner can also see all census lock attestations they or the Principal have signed, creating a permanent record of every enrollment declaration made to the platform.

### Exams Page
**Route:** `/school/exams`
**Who uses it:** Exam Officer, Deputy Exam Officer, Principal
**User stories:** US-ACA-001, US-ACA-004, FR-ACA-001, FR-ACA-004

The exam management hub. The Exam Officer configures grading schemes here — defining assessment components (Weekly Tests, Assignments, Mid-Term Test, Terminal Exam, etc.) and their weights. Weights must total exactly 100%. Once published, a scheme is locked for the term and cannot be edited. From here the Exam Officer publishes results when all gradebooks are complete, making them visible to Students and Parents and generating downloadable report cards. Results cannot be published for any student whose PSF obligation is unsettled.

### Gradebook Page
**Route:** `/school/gradebook`
**Who uses it:** Teacher, Class Teacher (read-only), Exam Officer
**User stories:** US-ACA-002, US-ACA-003, US-ACA-006, FR-ACA-005, FR-ACA-006, FR-ACA-011

The Teacher's primary working page. Shows one column per assessment component for each student in their assigned subjects. The Teacher enters scores and the system automatically computes the weighted total. A Teacher can only see and enter grades for their own assigned subjects. When all components are entered, the Teacher locks their gradebook. After locking, any change requires a formal Grade Correction request that goes to the Exam Officer and Principal for sequential approval. The Class Teacher sees a read-only consolidated view of all subjects for their entire class — useful for spotting which subject teachers haven't completed their gradebooks.

### Attendance Page
**Route:** `/school/attendance`
**Who uses it:** Class Teacher (mark), Principal and Admin Officer (view)
**User stories:** US-ACA-005, FR-ACA-002

Attendance marking is exclusive to Class Teachers. The Class Teacher sees their class list and marks each student as present, absent, or late for the day. On mobile, attendance can be marked offline and synced when connectivity returns. Once submitted for the day, attendance can be amended only within the same day and amendments are logged. The page also shows attendance summaries — per student, per day, with trends and thresholds — so the Class Teacher can see who is frequently absent. Automated alerts fire when a student's attendance drops below a configured threshold.

### Workflows Page
**Route:** `/school/workflows`
**Who uses it:** All school roles (as approvers or requesters)
**User stories:** US-WRK-001, US-WRK-002, US-WRK-003, FR-WFL-001 through FR-WFL-003

Each user's personal approval inbox. Shows every workflow item waiting for their action — refund approvals, grade corrections, admission decisions, and financial adjustments. Each item shows what it is, who submitted it, when, and the deadline. The user can approve, reject, or return the request with comments. They can also see the full history of requests they have submitted, tracking where each one stands and who is responsible for the next step.

### Communications Page
**Route:** `/school/comms`
**Who uses it:** Principal, Admin Officer, Class Teacher
**User stories:** US-COM-001, US-COM-002

The messaging hub. The Principal and Admin Officer can broadcast school-wide announcements to all staff, students, and parents. Class Teachers can send messages to all parents of students in their class. Messages can be sent as in-app notifications, email, or SMS. Message history is stored and searchable. Parents receive messages from all their children's schools in a unified inbox and can reply to Class Teachers.

### Settings Page
**Route:** `/school/settings`
**Who uses it:** All school roles
**User stories:** US-HRM-007, US-HRM-008

Personal and school-level settings. Each user can manage their own account — update phone number and notification preferences, view active sessions, revoke unknown sessions, deregister devices, change password, and manage MFA. Users cannot change their own email address or role without going through an approval workflow.

### Settings — Appearance Page
**Route:** `/school/settings/appearance`
**Who uses it:** All school roles

Theme and appearance settings for the console. The user can switch between light and dark mode.

---

## PARENT CONSOLE PAGES

The Parent Console is where parents manage everything related to their children across all schools. The mobile app is the primary interface for parents; the web console provides the same features for desktop access.

### Parent Dashboard
**Route:** `/parent/dashboard`
**Who uses it:** Parent
**User stories:** US-PAR-001, FR-PAR-001

The multi-child home screen. The parent sees all their linked children, regardless of which school each child attends. Each child is shown as a card with their name, school, current class, most recent attendance summary, latest result, outstanding fee balance, and any unread messages. Tapping a child opens their full detail view. All data is fetched separately per child's school — no cross-school data is mixed together.

### Attendance Page
**Route:** `/parent/attendance`
**Who uses it:** Parent
**User stories:** US-PAR-002

Shows the selected child's attendance record day by day for the current term — present, absent, or late. Monthly and term-to-date summary percentages are shown at the top. The parent can see patterns and identify any concerning absence trends. The parent cannot edit any attendance records.

### Results Page
**Route:** `/parent/results`
**Who uses it:** Parent, Student
**User stories:** US-PAR-003, US-STU-001, FR-PAR-002, FR-STU-003

Shows the selected child's published results. Results are visible only after the Exam Officer publishes them AND the child's PSF obligation for that term is settled. The parent sees subject-by-subject scores with the component breakdown according to the school's grading scheme. Report cards are downloadable as PDF with the school's branding. Historical results from prior terms are accessible.

### Fees Page
**Route:** `/parent/fees`
**Who uses it:** Parent
**User stories:** US-PAR-004, US-FIN-004, FR-PAR-003

The parent's financial hub for a child. Shows the current term's fee structure — each fee item and its amount, the total charged, what has been paid, and what is still outstanding. Payment history for all prior terms is available. The parent can pay fees directly through the platform using a card or bank transfer. On successful payment, a receipt is immediately available and an email confirmation is sent. The PSF portion of the payment is settled automatically.

### Settings Page
**Route:** `/parent/contact`
**Who uses it:** Parent
**User stories:** US-PAR-005

The parent manages their own account here — update phone number and email address, configure notification preferences, manage active sessions, and view linked children. Changing an email address requires MFA verification and a cooling-off period before it takes effect, with notifications sent to both old and new addresses during the transition.

---

## STUDENT PORTAL PAGES

The Student Portal is for students to access their own academic information. Like the Parent Console, the mobile app is the primary interface.

### Student Dashboard
**Route:** `/parent/dashboard` (student view)
**Who uses it:** Student
**User stories:** US-STU-001, FR-STU-001

The student's home screen. Shows their class timetable for the day, upcoming assignment deadlines with submission status, attendance summary for the term, and their most recent published results. Everything is read-only and scoped to the individual student.

### Results Page
**Route:** `/parent/results` (student view)
**Who uses it:** Student
**User stories:** US-STU-001, FR-STU-003

Same as the parent results page but scoped to the student's own data. Shows published results per subject with component score breakdown. Report cards are downloadable as PDF. Historical results from prior terms are available.

### Timetable Page
**Route:** `/parent/results` (student view)
**Who uses it:** Student
**User stories:** US-STU-002

Shows the student's weekly class timetable — which subject, with which teacher, in which room, at what time. Read-only. Updates when the Timetable Officer makes changes.

### Assignments Page
**Route:** `/parent/results` (student view)
**Who uses it:** Student
**User stories:** US-STU-003, FR-STU-002

Shows all active assignments for the student's enrolled subjects with titles, descriptions, due dates, and submission status. The student can submit assignments digitally — uploading files or entering text. Submissions after the due date are flagged as late but still accepted unless the teacher has closed submissions.

### Attendance Page
**Route:** `/parent/attendance` (student view)
**Who uses it:** Student
**User stories:** US-STU-004

Shows the student's own attendance record — day by day, with term summary. The student can monitor their own presence and spot any unmarked absences to discuss with their Class Teacher.

---

## REFERENCE: USER STORY TO PAGE MAPPING

| User Story | What it covers | Primary page(s) |
|-----------|----------------|-----------------|
| US-PLT-001 | Create a school tenant | Tenants → New Tenant |
| US-PLT-002 | Suspend/reinstate a tenant | Tenants, Tenant Detail |
| US-PLT-003 | Set global PSF rate | PSF Rates |
| US-PLT-004 | Approve PSF rate overrides | Approvals |
| US-PLT-005 | Monitor platform revenue | Platform Dashboard |
| US-PLT-006 | Break-glass support access | Tenant Detail (action) |
| US-PLT-007 | Manage IVP anomaly cases | Risk Cases, Risk Case Detail |
| US-REG-001 | Regional performance dashboard | Regional Dashboard |
| US-REG-002 | Onboard a new school | Onboard School |
| US-REG-003 | Manage subordinates | Subordinates |
| US-REG-004 | Referral earnings dashboard | Referral Earnings |
| US-REG-005 | Alerts on at-risk schools | Regional Dashboard |
| US-ASM-001 | Create academic year | Academic Sessions |
| US-ASM-002 | Configure and open a term | Academic Sessions |
| US-ASM-003 | Lock enrollment census | Census Lock |
| US-ASM-004 | Close a term | Academic Sessions |
| US-ASM-005 | Promote students at year end | Academic Sessions |
| US-ASM-006 | Graduate final-year students | Academic Sessions |
| US-ASM-007 | View academic calendar | Academic Sessions, all dashboards |
| US-SIS-001 | Submit admission application | Admissions → New Admission |
| US-SIS-002 | Record admission decision | Admissions |
| US-SIS-003 | Enroll admitted student | Student Detail |
| US-SIS-004 | Initiate parent-student link | Student Detail |
| US-SIS-005 | Accept parent-student link | Parent flow (OTP verification) |
| US-SIS-006 | Transfer student out | Students |
| US-SIS-007 | View student full profile | Student Detail |
| US-ACA-001 | Build grading scheme | Exams |
| US-ACA-002 | Enter gradebook scores | Gradebook |
| US-ACA-003 | Request grade correction | Gradebook (correction flow) |
| US-ACA-004 | Publish term results | Exams |
| US-ACA-005 | Mark daily attendance | Attendance |
| US-ACA-006 | Create timetable | Timetable |
| US-ACA-007 | Create assignments | Assignments |
| US-FIN-001 | Configure fee structure | Finance |
| US-FIN-002 | Log offline payment | Log Payment |
| US-FIN-003 | Verify offline payment | Verify Payments |
| US-FIN-004 | Pay school fees online | Parent Fees |
| US-FIN-005 | View outstanding balances | Outstanding Balances |
| US-FIN-006 | Initiate and approve refund | Refunds |
| US-FIN-007 | Reconcile payments (automated) | Payments (platform side) |
| US-COM-001 | School-wide announcement | Communications |
| US-COM-002 | Class-level message | Communications |
| US-COM-003 | Parent receive/reply | Parent console (inbox) |
| US-COM-004 | Push notifications | System-wide |
| US-PAR-001 | Multi-child dashboard | Parent Dashboard |
| US-PAR-002 | Track child's attendance | Parent Attendance |
| US-PAR-003 | View/download child's result | Parent Results |
| US-PAR-004 | Track fee status and pay | Parent Fees |
| US-PAR-005 | Update contact details | Parent Settings |
| US-STU-001 | View personal results | Student Results |
| US-STU-002 | View class timetable | Student Timetable |
| US-STU-003 | Submit assignment | Student Assignments |
| US-STU-004 | Track personal attendance | Student Attendance |
| US-WRK-001 | Configure workflow templates | Workflows (platform) |
| US-WRK-002 | View and act on pending approvals | Workflows |
| US-WRK-003 | Track submitted request status | Workflows |
| US-AUD-001 | Search and export audit log | Audit Log |
| US-AUD-002 | Manage DSARs | DSAR Queue |
| US-AUD-003 | Manage data breach | Breach Records |
| US-AUD-004 | View tenant audit trail | School Settings |
| US-AUD-005 | Review NDPA compliance | Compliance Posture |
| US-REV-001 | View PSF obligation ledger | PSF Obligations |
| US-REV-002 | View enrollment attestation history | PSF Obligations |
| US-REV-003 | Respond to IVP anomaly alert | School Dashboard (alert) |
| US-REV-004 | View platform ledger | Ledger |
| US-REV-005 | Waive PSF obligation | Approvals (waiver request) |
| US-REV-006 | Request enrollment recount | Risk Case Detail |
| US-REF-001 | Complete KYC verification | KYC Verifications |
| US-REF-002 | View referral code | Regional Settings |
| US-REF-003 | Monitor referral attribution | Referrals |
| US-REF-004 | Check 40% payout cap | Referrals, Referral Earnings |
| US-HRM-001 | Onboard new staff member | Invite Staff |
| US-HRM-002 | Assign subject to teacher | Staff Detail |
| US-HRM-003 | Assign class teacher | Staff Detail |
| US-HRM-004 | Change staff role | Staff Detail |
| US-HRM-005 | Deactivate staff member | Staff Detail |
| US-HRM-006 | View staff directory | Staff Directory |
| US-HRM-007 | Update personal contact details | Settings |
| US-HRM-008 | Manage active sessions/devices | Settings |
| US-HRM-009 | Resend expired staff invitation | Invite Staff |
| US-XC-001 | Log in with MFA | Login, MFA, MFA Setup |
| US-XC-002 | Biometric login (mobile) | Mobile only |
| US-XC-003 | Reset forgotten password | Password Reset |
| US-XC-004 | Step-up MFA for high-risk actions | Inline during actions |
| US-XC-005 | Session displacement notification | System (email) |

---

*Loomis Page Specification Document — every page in the platform, what it does, who uses it, and what user stories it covers. Designed as a Figma handoff — no technical implementation details, only product behaviour.*
