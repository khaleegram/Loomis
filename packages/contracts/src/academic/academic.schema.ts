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
    censusLockDate: calendarDate,
    examStartDate: calendarDate.optional(),
    examEndDate: calendarDate.optional(),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  })
  .refine((v) => v.censusLockDate >= v.startDate && v.censusLockDate <= v.endDate, {
    message: 'censusLockDate must fall within the term start and end dates (FR-ASM-004)',
    path: ['censusLockDate'],
  })
  .refine((v) => v.enrollmentWindowCloseDate <= v.censusLockDate, {
    message: 'enrollmentWindowCloseDate must be on or before censusLockDate (FR-ASM-004)',
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
  censusLockDate: calendarDate.nullable(),
  examStartDate: calendarDate.nullable(),
  examEndDate: calendarDate.nullable(),
  status: academicTermStatus,
  declaredBillableCount: z.number().int().nullable(),
  systemBillableCount: z.number().int().nullable(),
  openedAt: z.string().datetime().nullable(),
  censusLockedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AcademicTermResponse = z.infer<typeof academicTermResponse>;

export const academicTermListResponse = z.object({
  terms: z.array(academicTermResponse),
});
export type AcademicTermListResponse = z.infer<typeof academicTermListResponse>;

// ── Census Lock (Revenue Integrity) ──────────────────────────────────────────────

/**
 * FR-SIS-006 / FR-ASM-005 / US-ASM-003. The School Owner or Principal attests to
 * the billable student count and locks the census. This is the trigger that
 * creates PSF obligations (System Design §8.1) — performed in a single
 * SERIALIZABLE transaction with step-up MFA. It cannot be undone.
 *
 * `declaredBillableCount` is the legally-binding attested count. A variance from
 * the system count beyond tolerance requires a documented reason (§8.1 step 3).
 */
export const censusLockRequest = z.object({
  declaredBillableCount: z.number().int().nonnegative(),
  varianceReason: z.string().min(3).max(500).optional(),
  /** US-ASM-003: confirmation when the count is below the Minimum Term Commitment. */
  belowMtcAcknowledged: z.boolean().default(false),
});
export type CensusLockRequest = z.infer<typeof censusLockRequest>;

export const censusLockResponse = z.object({
  termId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  status: academicTermStatus,
  declaredBillableCount: z.number().int(),
  systemBillableCount: z.number().int().nullable(),
  psfRateMinor: z.number().int(),
  censusLockedAt: z.string().datetime(),
});
export type CensusLockResponse = z.infer<typeof censusLockResponse>;

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
