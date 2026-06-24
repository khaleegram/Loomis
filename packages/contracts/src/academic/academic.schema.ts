import { z } from 'zod';

/**
 * Academic Session module contracts (SRS §4.3 FR-ASM-001..010; §2.6 CON-017..022;
 * US-ASM-001..007; System Design §8.1). Shared by API request/response validation
 * and the web/mobile clients.
 */

/** Calendar date (no time component): YYYY-MM-DD. Stored as a Postgres `date`. */
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

// ── Academic Year ──────────────────────────────────────────────────────────────

/** draft → active → closed (archived). Activation is irreversible (FR-ASM-002). */
export const academicYearStatus = z.enum(['draft', 'active', 'closed']);
export type AcademicYearStatus = z.infer<typeof academicYearStatus>;

/** FR-ASM-001 / US-ASM-001. Only one active year per tenant (CON-017). */
export const createAcademicYearRequest = z
  .object({
    label: z
      .string()
      .min(4)
      .max(50)
      .regex(/^\S.*\S$/, 'Label cannot have leading/trailing whitespace'),
    startDate: calendarDate,
    endDate: calendarDate,
    /** Number of terms the year is divided into (FR-ASM-001). */
    termCount: z.number().int().min(1).max(6).default(3),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });
export type CreateAcademicYearRequest = z.infer<typeof createAcademicYearRequest>;

export const academicYearResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  label: z.string(),
  startDate: calendarDate,
  endDate: calendarDate,
  termCount: z.number().int(),
  status: academicYearStatus,
  activatedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AcademicYearResponse = z.infer<typeof academicYearResponse>;

export const academicYearListResponse = z.object({
  academicYears: z.array(academicYearResponse),
});
export type AcademicYearListResponse = z.infer<typeof academicYearListResponse>;

// ── Academic Term ────────────────────────────────────────────────────────────────

/** draft → open → census_locked → closed (System Design §8.1). */
export const academicTermStatus = z.enum(['draft', 'open', 'census_locked', 'closed']);
export type AcademicTermStatus = z.infer<typeof academicTermStatus>;

/**
 * FR-ASM-004 / US-ASM-002. Configure a draft term before opening it. The census
 * lock date must fall within the term's start/end dates, and the enrollment
 * window must close on or before the census lock date.
 */
export const configureTermRequest = z
  .object({
    name: z.string().min(1).max(50),
    startDate: calendarDate,
    endDate: calendarDate,
    enrollmentWindowOpenDate: calendarDate,
    enrollmentWindowCloseDate: calendarDate,
    censusSnapshotDate: calendarDate,
    examStartDate: calendarDate.optional(),
    examEndDate: calendarDate.optional(),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine((v) => v.censusSnapshotDate >= v.startDate && v.censusSnapshotDate <= v.endDate, {
    message: 'censusSnapshotDate must fall within the term start and end dates (FR-ASM-004)',
    path: ['censusSnapshotDate'],
  })
  .refine((v) => v.enrollmentWindowCloseDate <= v.censusSnapshotDate, {
    message: 'enrollmentWindowCloseDate must be on or before censusSnapshotDate (FR-ASM-004)',
    path: ['enrollmentWindowCloseDate'],
  })
  .refine((v) => v.enrollmentWindowOpenDate <= v.enrollmentWindowCloseDate, {
    message: 'enrollmentWindowOpenDate must be on or before enrollmentWindowCloseDate',
    path: ['enrollmentWindowOpenDate'],
  })
  .refine(
    (v) => v.examStartDate === undefined || v.examEndDate === undefined || v.examEndDate >= v.examStartDate,
    { message: 'examEndDate must be on or after examStartDate', path: ['examEndDate'] },
  );
export type ConfigureTermRequest = z.infer<typeof configureTermRequest>;

/**
 * FR-ASM-006 / US-ASM-004. Term closure is a gated operation. The Principal may
 * acknowledge non-financial blockers with a documented reason; financial
 * blockers (unsettled PSF, unverified offline payments) can NEVER be overridden
 * at the school level (CON-021).
 */
export const closeTermRequest = z.object({
  overrideReason: z.string().min(3).max(500).optional(),
});
export type CloseTermRequest = z.infer<typeof closeTermRequest>;

/**
 * FR-ASM-006 pre-close review. Read-only gate evaluation for the Principal before
 * submitting closure (financial blockers are never overridable at school level).
 */
export const termClosurePreviewResponse = z.object({
  termId: z.string().uuid(),
  termStatus: academicTermStatus,
  financialBlockers: z.array(z.string()),
  operationalBlockers: z.array(z.string()),
  canCloseWithoutOverride: z.boolean(),
});
export type TermClosurePreviewResponse = z.infer<typeof termClosurePreviewResponse>;

export const academicTermResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  name: z.string(),
  sequence: z.number().int(),
  startDate: calendarDate.nullable(),
  endDate: calendarDate.nullable(),
  enrollmentWindowOpenDate: calendarDate.nullable(),
  enrollmentWindowCloseDate: calendarDate.nullable(),
  censusSnapshotDate: calendarDate.nullable(),
  examStartDate: calendarDate.nullable(),
  examEndDate: calendarDate.nullable(),
  status: academicTermStatus,
  systemBillableCount: z.number().int().nullable(),
  openedAt: z.string().datetime().nullable(),
  snapshotCreatedAt: z.string().datetime().nullable(),
  adjustmentWindowEndsAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AcademicTermResponse = z.infer<typeof academicTermResponse>;

export const academicTermListResponse = z.object({
  terms: z.array(academicTermResponse),
});
export type AcademicTermListResponse = z.infer<typeof academicTermListResponse>;

// ── Platform Billing (Revenue Integrity) ─────────────────────────────────────────

export const snapshotNowRequest = z.object({
  confirmed: z.literal(true),
});
export type SnapshotNowRequest = z.infer<typeof snapshotNowRequest>;

export const enrollmentSnapshotResponse = z.object({
  termId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  status: academicTermStatus,
  systemBillableCount: z.number().int(),
  psfRateMinor: z.number().int(),
  snapshotCreatedAt: z.string().datetime(),
  adjustmentWindowEndsAt: z.string().datetime(),
});
export type EnrollmentSnapshotResponse = z.infer<typeof enrollmentSnapshotResponse>;

/** Billable enrollment count grouped by class level (platform billing preview). */
export const censusClassLevelBreakdown = z.object({
  classLevelId: z.string().uuid(),
  classLevelCode: z.string(),
  classLevelName: z.string(),
  billableCount: z.number().int(),
});
export type CensusClassLevelBreakdown = z.infer<typeof censusClassLevelBreakdown>;

/**
 * Platform billing preview (US-ASM-003). Read-only; does not create obligations.
 */
export const platformBillingPreviewResponse = z.object({
  termId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  termName: z.string(),
  termStatus: academicTermStatus,
  censusSnapshotDate: calendarDate.nullable(),
  snapshotCreatedAt: z.string().datetime().nullable(),
  adjustmentWindowEndsAt: z.string().datetime().nullable(),
  systemBillableCount: z.number().int(),
  classLevelBreakdown: z.array(censusClassLevelBreakdown),
  minimumTermCommitment: z.number().int().nullable(),
  psfRateMinor: z.number().int().nullable(),
});
export type PlatformBillingPreviewResponse = z.infer<typeof platformBillingPreviewResponse>;

export const psfAdjustmentDeltaType = z.enum(['add_students', 'remove_students']);
export type PsfAdjustmentDeltaType = z.infer<typeof psfAdjustmentDeltaType>;

export const psfAdjustmentStatus = z.enum(['pending', 'approved', 'rejected']);
export type PsfAdjustmentStatus = z.infer<typeof psfAdjustmentStatus>;

export const createPsfAdjustmentRequest = z.object({
  deltaType: psfAdjustmentDeltaType,
  studentIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().min(3).max(500),
});
export type CreatePsfAdjustmentRequest = z.infer<typeof createPsfAdjustmentRequest>;

export const psfAdjustmentRequestResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  requestedById: z.string().uuid(),
  reason: z.string(),
  deltaType: psfAdjustmentDeltaType,
  studentIds: z.array(z.string().uuid()),
  status: psfAdjustmentStatus,
  reviewedById: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type PsfAdjustmentRequestResponse = z.infer<typeof psfAdjustmentRequestResponse>;

export const psfAdjustmentRequestListResponse = z.object({
  requests: z.array(psfAdjustmentRequestResponse),
});
export type PsfAdjustmentRequestListResponse = z.infer<typeof psfAdjustmentRequestListResponse>;

/** @deprecated Use platformBillingPreviewResponse */
export const censusPreviewResponse = platformBillingPreviewResponse;
export type CensusPreviewResponse = PlatformBillingPreviewResponse;

// ── Class Structure (FR-ASM-009) ─────────────────────────────────────────────────

export const createClassLevelRequest = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  /** Ordering for progression (e.g. JSS1=1, JSS2=2 …). Unique within a tenant. */
  rank: z.number().int().min(1).max(100),
  isTerminal: z.boolean().default(false),
});
export type CreateClassLevelRequest = z.infer<typeof createClassLevelRequest>;

export const classLevelResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  rank: z.number().int(),
  isTerminal: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ClassLevelResponse = z.infer<typeof classLevelResponse>;

export const classLevelListResponse = z.object({
  levels: z.array(classLevelResponse),
});
export type ClassLevelListResponse = z.infer<typeof classLevelListResponse>;

export const createClassArmRequest = z.object({
  academicYearId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  name: z.string().min(1).max(30),
});
export type CreateClassArmRequest = z.infer<typeof createClassArmRequest>;

export const classArmResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
});
export type ClassArmResponse = z.infer<typeof classArmResponse>;

export const classStructureResponse = z.object({
  levels: z.array(classLevelResponse),
  arms: z.array(classArmResponse),
});
export type ClassStructureResponse = z.infer<typeof classStructureResponse>;

/**
 * FR-ASM-009. The progression map defines which level a student moves to at year
 * end. A terminal level (e.g. SS3) has no destination — `toClassLevelId` is null.
 */
export const upsertProgressionRequest = z
  .object({
    fromClassLevelId: z.string().uuid(),
    toClassLevelId: z.string().uuid().nullable().default(null),
    isTerminal: z.boolean().default(false),
  })
  .refine((v) => (v.isTerminal ? v.toClassLevelId === null : v.toClassLevelId !== null), {
    message: 'A terminal level has no destination; a non-terminal level requires toClassLevelId',
    path: ['toClassLevelId'],
  });
export type UpsertProgressionRequest = z.infer<typeof upsertProgressionRequest>;

export const progressionResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  fromClassLevelId: z.string().uuid(),
  toClassLevelId: z.string().uuid().nullable(),
  isTerminal: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ProgressionResponse = z.infer<typeof progressionResponse>;

export const progressionMapResponse = z.object({
  progressions: z.array(progressionResponse),
});
export type ProgressionMapResponse = z.infer<typeof progressionMapResponse>;

// ── Promotion & Graduation (FR-ASM-007/008) ──────────────────────────────────────

export const promotionOutcome = z.enum(['promoted', 'held_back', 'graduated']);
export type PromotionOutcome = z.infer<typeof promotionOutcome>;

export const promotionDecision = z
  .object({
    studentId: z.string().uuid(),
    fromClassLevelId: z.string().uuid().nullable().default(null),
    fromClassArmId: z.string().uuid().nullable().default(null),
    outcome: promotionOutcome,
    toClassLevelId: z.string().uuid().nullable().default(null),
    toClassArmId: z.string().uuid().nullable().default(null),
    /** Required when a student is held back (FR-ASM-007). */
    heldBackReason: z.string().min(3).max(500).optional(),
  })
  .refine((v) => v.outcome !== 'held_back' || (v.heldBackReason?.length ?? 0) > 0, {
    message: 'A held-back student requires a documented reason (FR-ASM-007)',
    path: ['heldBackReason'],
  })
  .refine((v) => v.outcome !== 'graduated' || (v.toClassLevelId === null && v.toClassArmId === null), {
    message: 'A graduated student has no destination class',
    path: ['toClassLevelId'],
  });
export type PromotionDecision = z.infer<typeof promotionDecision>;

/**
 * FR-ASM-007. The Principal/Admin Officer stages the promotion list at year end.
 * Records are not effective until the next year is activated and a term opened.
 */
export const stagePromotionRequest = z.object({
  fromAcademicYearId: z.string().uuid(),
  toAcademicYearId: z.string().uuid(),
  decisions: z.array(promotionDecision).min(1),
});
export type StagePromotionRequest = z.infer<typeof stagePromotionRequest>;

export const confirmPromotionRequest = z.object({
  fromAcademicYearId: z.string().uuid(),
});
export type ConfirmPromotionRequest = z.infer<typeof confirmPromotionRequest>;

export const promotionRecordResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
  fromAcademicYearId: z.string().uuid(),
  toAcademicYearId: z.string().uuid(),
  fromClassLevelId: z.string().uuid().nullable(),
  fromClassArmId: z.string().uuid().nullable(),
  toClassLevelId: z.string().uuid().nullable(),
  toClassArmId: z.string().uuid().nullable(),
  outcome: promotionOutcome,
  heldBackReason: z.string().nullable(),
  status: z.enum(['proposed', 'confirmed']),
  confirmedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type PromotionRecordResponse = z.infer<typeof promotionRecordResponse>;

export const promotionListResponse = z.object({
  records: z.array(promotionRecordResponse),
});
export type PromotionListResponse = z.infer<typeof promotionListResponse>;


// ── Attendance (SRS §4.5 FR-ACA-002; CON-003; US-ACA-005) ────────────────────
//
// Attendance marking is EXCLUSIVELY a Class Teacher capability (CON-003). Regular
// Teachers have no attendance access at all — enforced at the route middleware
// (requireRole('class_teacher')) and again in the service layer. Offline entries
// captured on the mobile app are signed with a per-tenant device key and verified
// server-side at sync (MOB-007). A submitted day's attendance may be amended only
// within the same day, and every amendment is logged.

export const attendanceStatus = z.enum(['present', 'absent', 'late', 'excused']);
export type AttendanceStatus = z.infer<typeof attendanceStatus>;

/** Session granularity — schools may mark once per day or split AM/PM. */
export const attendanceSession = z.enum(['morning', 'afternoon', 'full_day']);
export type AttendanceSession = z.infer<typeof attendanceSession>;

/** How a record reached the server (FR-ACA-002 offline support / MOB-007). */
export const attendanceSource = z.enum(['online', 'offline_sync']);
export type AttendanceSource = z.infer<typeof attendanceSource>;

/** One student's status within a batch mark. */
export const attendanceMarkEntry = z.object({
  studentId: z.string().uuid(),
  status: attendanceStatus,
});
export type AttendanceMarkEntry = z.infer<typeof attendanceMarkEntry>;

/**
 * US-ACA-005. The Class Teacher marks the whole class list for one date/session
 * in a single online call. `attendanceDate` must be today (server-validated).
 */
export const markAttendanceRequest = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  attendanceDate: calendarDate,
  session: attendanceSession.default('full_day'),
  entries: z.array(attendanceMarkEntry).min(1).max(500),
});
export type MarkAttendanceRequest = z.infer<typeof markAttendanceRequest>;

/** Same-day amendment of a single record (US-ACA-005). Reason is logged. */
export const amendAttendanceRequest = z.object({
  status: attendanceStatus,
  reason: z.string().min(3).max(500),
});
export type AmendAttendanceRequest = z.infer<typeof amendAttendanceRequest>;

/**
 * A single offline-captured entry. It is self-describing (carries its own
 * tenant/term/class/student/date) and is signed by the device's private key over
 * the canonical message (see device-signature.ts). `originTenantId` MUST match
 * the authenticated tenant at sync time — any mismatch rejects the WHOLE batch
 * (MOB-007: never partially applied).
 */
export const offlineAttendanceEntry = z.object({
  originTenantId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  studentId: z.string().uuid(),
  attendanceDate: calendarDate,
  session: attendanceSession.default('full_day'),
  status: attendanceStatus,
  /** When the entry was captured on-device (ISO-8601), part of the signed message. */
  capturedAt: z.string().datetime(),
  /** Base64 ECDSA P-256 (IEEE-P1363) signature over the canonical message. */
  signature: z.string().min(1).max(512),
});
export type OfflineAttendanceEntry = z.infer<typeof offlineAttendanceEntry>;

/** US-ACA-005 offline sync. All entries are verified before any are applied. */
export const syncOfflineAttendanceRequest = z.object({
  deviceId: z.string().uuid(),
  entries: z.array(offlineAttendanceEntry).min(1).max(200),
});
export type SyncOfflineAttendanceRequest = z.infer<typeof syncOfflineAttendanceRequest>;

export const listAttendanceQuery = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  attendanceDate: calendarDate.optional(),
  studentId: z.string().uuid().optional(),
});
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuery>;

export const attendanceRecordResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  studentId: z.string().uuid(),
  attendanceDate: calendarDate,
  session: attendanceSession,
  status: attendanceStatus,
  source: attendanceSource,
  deviceId: z.string().uuid().nullable(),
  signatureVerified: z.boolean(),
  markedByStaffProfileId: z.string().uuid(),
  capturedAt: z.string().datetime().nullable(),
  syncedAt: z.string().datetime().nullable(),
  amendedAt: z.string().datetime().nullable(),
  previousStatus: attendanceStatus.nullable(),
  amendmentReason: z.string().nullable(),
  amendmentCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AttendanceRecordResponse = z.infer<typeof attendanceRecordResponse>;

export const attendanceListResponse = z.object({
  records: z.array(attendanceRecordResponse),
});
export type AttendanceListResponse = z.infer<typeof attendanceListResponse>;

export const syncOfflineAttendanceResponse = z.object({
  applied: z.number().int(),
  records: z.array(attendanceRecordResponse),
});
export type SyncOfflineAttendanceResponse = z.infer<typeof syncOfflineAttendanceResponse>;

// ── Attendance Device Keys (MOB-007: per-tenant device signing key) ───────────
//
// The mobile client generates an ECDSA P-256 key pair, keeps the private key in
// the device secure keystore, and registers the PUBLIC key here. The server uses
// it to verify offline attendance signatures at sync.

export const registerDeviceKeyRequest = z.object({
  deviceId: z.string().uuid(),
  /** SPKI PEM-encoded ECDSA P-256 public key. */
  publicKeyPem: z.string().min(1).max(2000),
  label: z.string().min(1).max(120).optional(),
});
export type RegisterDeviceKeyRequest = z.infer<typeof registerDeviceKeyRequest>;

export const deviceKeyResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  deviceId: z.string().uuid(),
  label: z.string().nullable(),
  revoked: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DeviceKeyResponse = z.infer<typeof deviceKeyResponse>;

export const deviceKeyListResponse = z.object({
  devices: z.array(deviceKeyResponse),
});
export type DeviceKeyListResponse = z.infer<typeof deviceKeyListResponse>;

// ── Timetable (SRS §4.5 FR-ACA-001; US-ACA-006) ──────────────────────────────
//
// A timetable is the set of period slots for a (term, class arm). The builder
// detects conflicts — a teacher or class arm double-booked in an overlapping
// time window on the same weekday — and refuses to save (US-ACA-006).
// Times are minutes-from-midnight to make overlap maths exact and timezone-free.

export const timetableEntryStatus = z.enum(['draft', 'published', 'marked_for_removal']);
export type TimetableEntryStatus = z.infer<typeof timetableEntryStatus>;

/** 1 = Monday … 7 = Sunday (ISO-8601 weekday). */
export const weekday = z.number().int().min(1).max(7);

export const createTimetableEntryRequest = z
  .object({
    termId: z.string().uuid(),
    classArmId: z.string().uuid(),
    subjectId: z.string().uuid(),
    teacherStaffProfileId: z.string().uuid(),
    dayOfWeek: weekday,
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((v) => v.endMinute > v.startMinute, {
    message: 'endMinute must be after startMinute',
    path: ['endMinute'],
  });
export type CreateTimetableEntryRequest = z.infer<typeof createTimetableEntryRequest>;

export const publishTimetableRequest = z.object({
  termId: z.string().uuid(),
});
export type PublishTimetableRequest = z.infer<typeof publishTimetableRequest>;

export const publishTimetableClassArmResult = z.object({
  classArmId: z.string().uuid(),
  publishedCount: z.number().int().nonnegative(),
});
export type PublishTimetableClassArmResult = z.infer<typeof publishTimetableClassArmResult>;

export const publishTimetableResponse = z.object({
  termId: z.string().uuid(),
  publishedSlotCount: z.number().int().nonnegative(),
  publishedClassArms: z.number().int().nonnegative(),
  classArms: z.array(publishTimetableClassArmResult),
});
export type PublishTimetableResponse = z.infer<typeof publishTimetableResponse>;

export const timetablePublishPreviewQuery = z.object({
  termId: z.string().uuid(),
});
export type TimetablePublishPreviewQuery = z.infer<typeof timetablePublishPreviewQuery>;

export const timetablePublishPreviewEntry = z.object({
  entryId: z.string().uuid(),
  classArmId: z.string().uuid(),
  classArmLabel: z.string(),
  subjectId: z.string().uuid(),
  teacherName: z.string().nullable(),
  dayOfWeek: z.number().int(),
  startMinute: z.number().int(),
  endMinute: z.number().int(),
});
export type TimetablePublishPreviewEntry = z.infer<typeof timetablePublishPreviewEntry>;

export const timetablePublishPreviewChange = z.object({
  classArmLabel: z.string(),
  dayOfWeek: z.number().int(),
  startMinute: z.number().int(),
  endMinute: z.number().int(),
  removed: timetablePublishPreviewEntry,
  added: timetablePublishPreviewEntry,
});
export type TimetablePublishPreviewChange = z.infer<typeof timetablePublishPreviewChange>;

export const timetablePublishPreviewResponse = z.object({
  termId: z.string().uuid(),
  termName: z.string(),
  additions: z.array(timetablePublishPreviewEntry),
  removals: z.array(timetablePublishPreviewEntry),
  changes: z.array(timetablePublishPreviewChange),
  totalPending: z.number().int().nonnegative(),
});
export type TimetablePublishPreviewResponse = z.infer<typeof timetablePublishPreviewResponse>;

export const listTimetableQuery = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
});
export type ListTimetableQuery = z.infer<typeof listTimetableQuery>;

export const timetableEntryResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherStaffProfileId: z.string().uuid(),
  teacherName: z.string().nullable().optional(),
  classArmLabel: z.string().nullable().optional(),
  dayOfWeek: z.number().int(),
  startMinute: z.number().int(),
  endMinute: z.number().int(),
  status: timetableEntryStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TimetableEntryResponse = z.infer<typeof timetableEntryResponse>;

export const timetableListResponse = z.object({
  entries: z.array(timetableEntryResponse),
  classArmId: z.string().uuid().optional(),
  classArmLabel: z.string().nullable().optional(),
  /** When the viewer is a class teacher, the class they oversee this term. */
  classTeacherClassArmId: z.string().uuid().nullable().optional(),
  classTeacherClassArmLabel: z.string().nullable().optional(),
});
export type TimetableListResponse = z.infer<typeof timetableListResponse>;

export const listTimetableSubjectOptionsQuery = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
});
export type ListTimetableSubjectOptionsQuery = z.infer<typeof listTimetableSubjectOptionsQuery>;

export const timetableSubjectOptionResponse = z.object({
  assignmentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherStaffProfileId: z.string().uuid(),
  teacherName: z.string(),
});
export type TimetableSubjectOptionResponse = z.infer<typeof timetableSubjectOptionResponse>;

export const timetableSubjectOptionsResponse = z.object({
  options: z.array(timetableSubjectOptionResponse),
});
export type TimetableSubjectOptionsResponse = z.infer<typeof timetableSubjectOptionsResponse>;

export const timetableClassArmSummaryStatus = z.enum(['empty', 'draft', 'published']);
export type TimetableClassArmSummaryStatus = z.infer<typeof timetableClassArmSummaryStatus>;

export const timetableClassArmSummary = z.object({
  classArmId: z.string().uuid(),
  classArmLabel: z.string(),
  status: timetableClassArmSummaryStatus,
  lessonCount: z.number().int().nonnegative(),
  draftCount: z.number().int().nonnegative(),
});
export type TimetableClassArmSummary = z.infer<typeof timetableClassArmSummary>;

export const timetableTermSummaryQuery = z.object({
  termId: z.string().uuid(),
});
export type TimetableTermSummaryQuery = z.infer<typeof timetableTermSummaryQuery>;

export const timetableTermSummaryResponse = z.object({
  termId: z.string().uuid(),
  termName: z.string(),
  totalClassArms: z.number().int().nonnegative(),
  publishedClassArms: z.number().int().nonnegative(),
  draftClassArms: z.number().int().nonnegative(),
  emptyClassArms: z.number().int().nonnegative(),
  totalDraftSlots: z.number().int().nonnegative(),
  totalPublishedSlots: z.number().int().nonnegative(),
  bellPeriodsPerDay: z.number().int().positive(),
  classArms: z.array(timetableClassArmSummary),
});
export type TimetableTermSummaryResponse = z.infer<typeof timetableTermSummaryResponse>;

// ── Bell schedule (school day template per academic year) ─────────────────────

export const bellScheduleSlotType = z.enum(['lesson', 'break']);
export type BellScheduleSlotType = z.infer<typeof bellScheduleSlotType>;

export const bellScheduleSlot = z
  .object({
    label: z.string().min(1).max(40),
    type: bellScheduleSlotType,
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((slot) => slot.endMinute > slot.startMinute, {
    message: 'endMinute must be after startMinute',
    path: ['endMinute'],
  });
export type BellScheduleSlot = z.infer<typeof bellScheduleSlot>;

/** Default Nigerian secondary-school day when a tenant has not customised yet. */
export const DEFAULT_BELL_SCHEDULE_SLOTS: BellScheduleSlot[] = [
  { label: 'Period 1', type: 'lesson', startMinute: 480, endMinute: 520 },
  { label: 'Period 2', type: 'lesson', startMinute: 520, endMinute: 560 },
  { label: 'Period 3', type: 'lesson', startMinute: 560, endMinute: 600 },
  { label: 'Break', type: 'break', startMinute: 600, endMinute: 620 },
  { label: 'Period 4', type: 'lesson', startMinute: 620, endMinute: 660 },
  { label: 'Period 5', type: 'lesson', startMinute: 660, endMinute: 700 },
  { label: 'Period 6', type: 'lesson', startMinute: 700, endMinute: 740 },
  { label: 'Lunch', type: 'break', startMinute: 740, endMinute: 820 },
  { label: 'Period 7', type: 'lesson', startMinute: 820, endMinute: 860 },
  { label: 'Period 8', type: 'lesson', startMinute: 860, endMinute: 900 },
];

export const bellScheduleQuery = z.object({
  academicYearId: z.string().uuid(),
});
export type BellScheduleQuery = z.infer<typeof bellScheduleQuery>;

export const upsertBellScheduleRequest = z.object({
  academicYearId: z.string().uuid(),
  slots: z.array(bellScheduleSlot).min(1).max(24),
});
export type UpsertBellScheduleRequest = z.infer<typeof upsertBellScheduleRequest>;

export const bellScheduleResponse = z.object({
  academicYearId: z.string().uuid(),
  slots: z.array(bellScheduleSlot),
  isDefault: z.boolean(),
  lessonPeriodCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime().nullable(),
});
export type BellScheduleResponse = z.infer<typeof bellScheduleResponse>;

export const myTimetableQuery = z.object({
  termId: z.string().uuid(),
});
export type MyTimetableQuery = z.infer<typeof myTimetableQuery>;

export const teachingStaffContextQuery = z.object({
  termId: z.string().uuid(),
});
export type TeachingStaffContextQuery = z.infer<typeof teachingStaffContextQuery>;

export const teachingSubjectAssignmentResponse = z.object({
  assignmentId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  classArmLabel: z.string(),
  subjectId: z.string().uuid(),
});
export type TeachingSubjectAssignmentResponse = z.infer<typeof teachingSubjectAssignmentResponse>;

export const teachingClassTeacherAssignmentResponse = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  classArmLabel: z.string(),
});
export type TeachingClassTeacherAssignmentResponse = z.infer<
  typeof teachingClassTeacherAssignmentResponse
>;

export const teachingStaffContextResponse = z.object({
  staffProfileId: z.string().uuid(),
  subjectAssignments: z.array(teachingSubjectAssignmentResponse),
  classTeacherAssignment: teachingClassTeacherAssignmentResponse.nullable(),
});
export type TeachingStaffContextResponse = z.infer<typeof teachingStaffContextResponse>;

export const parentTimetableQuery = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
});
export type ParentTimetableQuery = z.infer<typeof parentTimetableQuery>;

export const parentAttendanceQuery = parentTimetableQuery;
export type ParentAttendanceQuery = z.infer<typeof parentAttendanceQuery>;

export const parentResultsQuery = parentTimetableQuery;
export type ParentResultsQuery = z.infer<typeof parentResultsQuery>;

export const myAttendanceQuery = z.object({
  termId: z.string().uuid(),
});
export type MyAttendanceQuery = z.infer<typeof myAttendanceQuery>;

export const attendanceTermSummary = z.object({
  present: z.number().int(),
  absent: z.number().int(),
  late: z.number().int(),
  excused: z.number().int(),
});
export type AttendanceTermSummary = z.infer<typeof attendanceTermSummary>;

export const childAttendanceResponse = z.object({
  records: z.array(attendanceRecordResponse),
  summary: attendanceTermSummary,
  classArmLabel: z.string().nullable(),
});
export type ChildAttendanceResponse = z.infer<typeof childAttendanceResponse>;

// ── Assignments & Submissions (SRS §4.5 FR-ACA-003; US-ACA-007) ───────────────
//
// Teachers create assignments for their own assigned subject/class (verified at
// the service layer against the HRM subject assignment). Students submit; teachers
// grade against individual submissions. A submission after the due date is flagged
// late automatically.

export const assignmentStatus = z.enum(['draft', 'published', 'closed']);
export type AssignmentStatus = z.infer<typeof assignmentStatus>;

export const createAssignmentRequest = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  instructions: z.string().min(1).max(5000),
  dueAt: z.string().datetime(),
  maxScore: z.number().int().min(1).max(1000).default(100),
});
export type CreateAssignmentRequest = z.infer<typeof createAssignmentRequest>;

export const updateAssignmentRequest = z.object({
  title: z.string().min(1).max(200).optional(),
  instructions: z.string().min(1).max(5000).optional(),
  dueAt: z.string().datetime().optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
});
export type UpdateAssignmentRequest = z.infer<typeof updateAssignmentRequest>;

export const listAssignmentsQuery = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
});
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuery>;

export const assignmentResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherStaffProfileId: z.string().uuid(),
  title: z.string(),
  instructions: z.string(),
  dueAt: z.string().datetime(),
  maxScore: z.number().int(),
  status: assignmentStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AssignmentResponse = z.infer<typeof assignmentResponse>;

export const assignmentListResponse = z.object({
  assignments: z.array(assignmentResponse),
});
export type AssignmentListResponse = z.infer<typeof assignmentListResponse>;

export const myAssignmentsQuery = z.object({
  termId: z.string().uuid(),
});
export type MyAssignmentsQuery = z.infer<typeof myAssignmentsQuery>;

export const submissionStatus = z.enum(['submitted', 'late', 'graded', 'returned']);
export type SubmissionStatus = z.infer<typeof submissionStatus>;

/** A student submits work — text content and/or an uploaded storage object. */
export const createSubmissionRequest = z
  .object({
    content: z.string().min(1).max(10000).optional(),
    storageObjectId: z.string().uuid().optional(),
  })
  .refine((v) => v.content !== undefined || v.storageObjectId !== undefined, {
    message: 'A submission must include content or an attached file',
    path: ['content'],
  });
export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequest>;

export const gradeSubmissionRequest = z.object({
  score: z.number().int().min(0).max(1000),
  feedback: z.string().min(1).max(2000).optional(),
});
export type GradeSubmissionRequest = z.infer<typeof gradeSubmissionRequest>;

export const submissionResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  content: z.string().nullable(),
  storageObjectId: z.string().uuid().nullable(),
  status: submissionStatus,
  isLate: z.boolean(),
  submittedAt: z.string().datetime(),
  score: z.number().int().nullable(),
  feedback: z.string().nullable(),
  gradedByStaffProfileId: z.string().uuid().nullable(),
  gradedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SubmissionResponse = z.infer<typeof submissionResponse>;

export const submissionListResponse = z.object({
  submissions: z.array(submissionResponse),
});
export type SubmissionListResponse = z.infer<typeof submissionListResponse>;

export const studentAssignmentItemResponse = assignmentResponse.extend({
  mySubmission: submissionResponse.nullable().optional(),
});
export type StudentAssignmentItemResponse = z.infer<typeof studentAssignmentItemResponse>;

export const studentAssignmentListResponse = z.object({
  assignments: z.array(studentAssignmentItemResponse),
  classArmLabel: z.string().nullable(),
});
export type StudentAssignmentListResponse = z.infer<typeof studentAssignmentListResponse>;
