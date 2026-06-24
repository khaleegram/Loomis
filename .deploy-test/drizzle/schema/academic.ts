import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { tenants } from './tenant';

export const academicSchema = pgSchema('academic');

/**
 * Academic years (FR-ASM-001/002/003; CON-017). A year moves draft → active →
 * closed. Only one year may be `active` per tenant at a time (CON-017) — enforced
 * by a partial unique index in the migration. Activation is irreversible.
 */
export const academicYears = academicSchema.table(
  'academic_years',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    label: varchar('label', { length: 50 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    termCount: integer('term_count').notNull().default(3),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    activatedById: uuid('activated_by_id'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closedById: uuid('closed_by_id'),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantLabelUnique: uniqueIndex('academic_years_tenant_id_label_unique').on(
      table.tenantId,
      table.label,
    ),
    tenantStatusIdx: index('academic_years_tenant_id_status_idx').on(table.tenantId, table.status),
    statusValid: check(
      'academic_years_status_valid',
      sql`${table.status} IN ('draft', 'active', 'closed')`,
    ),
    datesValid: check('academic_years_dates_valid', sql`${table.endDate} > ${table.startDate}`),
    termCountValid: check(
      'academic_years_term_count_valid',
      sql`${table.termCount} BETWEEN 1 AND 6`,
    ),
  }),
);

/**
 * Academic terms (FR-ASM-004/005/006; System Design §8.1). Created as draft
 * placeholders at year activation, then configured and opened. Status lifecycle:
 * draft → open → census_locked → closed. Only one term per year may be `open`
 * (CON-018) — enforced by a partial unique index in the migration.
 *
 * Date columns are nullable until the term is configured (FR-ASM-004). The
 * census/window date invariants are checked in the migration only when present.
 */
export const academicTerms = academicSchema.table(
  'academic_terms',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id),
    name: varchar('name', { length: 50 }).notNull(),
    sequence: integer('sequence').notNull(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    enrollmentWindowOpenDate: date('enrollment_window_open_date'),
    enrollmentWindowCloseDate: date('enrollment_window_close_date'),
    censusLockDate: date('census_lock_date'),
    examStartDate: date('exam_start_date'),
    examEndDate: date('exam_end_date'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // Set inside the census lock transaction (System Design §8.1).
    declaredBillableCount: integer('declared_billable_count'),
    systemBillableCount: integer('system_billable_count'),
    censusVarianceReason: varchar('census_variance_reason', { length: 500 }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    openedById: uuid('opened_by_id'),
    censusLockedAt: timestamp('census_locked_at', { withTimezone: true }),
    censusLockedById: uuid('census_locked_by_id'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closedById: uuid('closed_by_id'),
    closureOverrideReason: varchar('closure_override_reason', { length: 500 }),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    yearSequenceUnique: uniqueIndex('academic_terms_year_id_sequence_unique').on(
      table.academicYearId,
      table.sequence,
    ),
    tenantYearStatusIdx: index('academic_terms_tenant_year_status_idx').on(
      table.tenantId,
      table.academicYearId,
      table.status,
    ),
    statusValid: check(
      'academic_terms_status_valid',
      sql`${table.status} IN ('draft', 'open', 'census_locked', 'closed')`,
    ),
    sequenceValid: check('academic_terms_sequence_valid', sql`${table.sequence} > 0`),
  }),
);

/**
 * Class levels (FR-ASM-009) — e.g. JSS1, JSS2, SS3. `rank` orders levels for the
 * progression map. `isTerminal` marks a leaving level (e.g. SS3) with no
 * progression destination. Reference data per tenant (not year-scoped).
 */
export const classLevels = academicSchema.table(
  'class_levels',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    code: varchar('code', { length: 30 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    rank: integer('rank').notNull(),
    isTerminal: boolean('is_terminal').notNull().default(false),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantCodeUnique: uniqueIndex('class_levels_tenant_id_code_unique').on(
      table.tenantId,
      table.code,
    ),
    tenantRankUnique: uniqueIndex('class_levels_tenant_id_rank_unique').on(
      table.tenantId,
      table.rank,
    ),
  }),
);

/**
 * Class arms / streams (FR-ASM-009) — e.g. JSS1A, JSS1B. Created fresh per
 * academic year so a year's class assignments are never overwritten by the next
 * year's setup.
 */
export const classArms = academicSchema.table(
  'class_arms',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id),
    classLevelId: uuid('class_level_id')
      .notNull()
      .references(() => classLevels.id),
    name: varchar('name', { length: 30 }).notNull(),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    armUnique: uniqueIndex('class_arms_year_level_name_unique').on(
      table.tenantId,
      table.academicYearId,
      table.classLevelId,
      table.name,
    ),
    tenantYearIdx: index('class_arms_tenant_year_idx').on(table.tenantId, table.academicYearId),
  }),
);

/**
 * Class progression map (FR-ASM-009). Defines the destination level a student
 * moves to at year end. One row per source level. A terminal level has a null
 * destination and `is_terminal = true` (consistency enforced by a CHECK).
 */
export const classProgressionMap = academicSchema.table(
  'class_progression_map',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    fromClassLevelId: uuid('from_class_level_id')
      .notNull()
      .references(() => classLevels.id),
    toClassLevelId: uuid('to_class_level_id').references(() => classLevels.id),
    isTerminal: boolean('is_terminal').notNull().default(false),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    fromUnique: uniqueIndex('class_progression_map_tenant_from_unique').on(
      table.tenantId,
      table.fromClassLevelId,
    ),
    terminalConsistent: check(
      'class_progression_map_terminal_consistent',
      sql`(${table.isTerminal} = true AND ${table.toClassLevelId} IS NULL) OR (${table.isTerminal} = false AND ${table.toClassLevelId} IS NOT NULL)`,
    ),
  }),
);

/**
 * Student promotion records (FR-ASM-007/008). Permanently link a student's class
 * in a closing year to their class in the new year (or mark them graduated).
 * `student_id` references the Student module (not built yet) so it is stored
 * without a DB FK, mirroring hrm.subject_assignments' term/class references.
 */
export const studentPromotionRecords = academicSchema.table(
  'student_promotion_records',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    studentId: uuid('student_id').notNull(),
    fromAcademicYearId: uuid('from_academic_year_id')
      .notNull()
      .references(() => academicYears.id),
    toAcademicYearId: uuid('to_academic_year_id')
      .notNull()
      .references(() => academicYears.id),
    fromClassLevelId: uuid('from_class_level_id').references(() => classLevels.id),
    fromClassArmId: uuid('from_class_arm_id').references(() => classArms.id),
    toClassLevelId: uuid('to_class_level_id').references(() => classLevels.id),
    toClassArmId: uuid('to_class_arm_id').references(() => classArms.id),
    outcome: varchar('outcome', { length: 20 }).notNull(),
    heldBackReason: varchar('held_back_reason', { length: 500 }),
    status: varchar('status', { length: 20 }).notNull().default('proposed'),
    decidedById: uuid('decided_by_id').notNull(),
    confirmedById: uuid('confirmed_by_id'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentYearUnique: uniqueIndex('student_promotion_records_from_year_student_unique').on(
      table.tenantId,
      table.fromAcademicYearId,
      table.studentId,
    ),
    toYearIdx: index('student_promotion_records_to_year_idx').on(
      table.tenantId,
      table.toAcademicYearId,
    ),
    outcomeValid: check(
      'student_promotion_records_outcome_valid',
      sql`${table.outcome} IN ('promoted', 'held_back', 'graduated')`,
    ),
    statusValid: check(
      'student_promotion_records_status_valid',
      sql`${table.status} IN ('proposed', 'confirmed')`,
    ),
    heldBackReasonPresent: check(
      'student_promotion_records_held_back_reason',
      sql`${table.outcome} <> 'held_back' OR ${table.heldBackReason} IS NOT NULL`,
    ),
  }),
);

/**
 * Grading schemes (SRS §4.5 / US-ACA-001). A tenant can define reusable CA/exam
 * weighting policies. The two component weights must sum to exactly 100 in both
 * Zod contracts and this DB CHECK so persisted totals are comparable.
 */
export const gradingSchemes = academicSchema.table(
  'grading_schemes',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 100 }).notNull(),
    continuousAssessmentWeight: integer('continuous_assessment_weight').notNull(),
    examWeight: integer('exam_weight').notNull(),
    passMark: integer('pass_mark').notNull().default(40),
    gradeBands: jsonb('grade_bands')
      .$type<Array<{ minScore: number; maxScore: number; grade: string; remark: string | null }>>()
      .notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantNameUnique: uniqueIndex('grading_schemes_tenant_id_name_unique').on(
      table.tenantId,
      table.name,
    ),
    defaultUnique: uniqueIndex('grading_schemes_tenant_default_unique')
      .on(table.tenantId)
      .where(sql`${table.isDefault} = true`),
    weightsSum: check(
      'grading_schemes_weights_sum_100',
      sql`${table.continuousAssessmentWeight} + ${table.examWeight} = 100`,
    ),
    weightsRange: check(
      'grading_schemes_weights_range',
      sql`${table.continuousAssessmentWeight} BETWEEN 0 AND 100 AND ${table.examWeight} BETWEEN 0 AND 100`,
    ),
    passMarkRange: check('grading_schemes_pass_mark_range', sql`${table.passMark} BETWEEN 0 AND 100`),
  }),
);

/**
 * Exam configuration for a term/class/subject (SRS §4.5 / US-ACA-002). Subjects
 * are still represented by UUIDs from HRM assignment records until a subject
 * catalogue lands in Academic.
 */
export const examConfigs = academicSchema.table(
  'exam_configs',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id),
    classArmId: uuid('class_arm_id')
      .notNull()
      .references(() => classArms.id),
    subjectId: uuid('subject_id').notNull(),
    gradingSchemeId: uuid('grading_scheme_id')
      .notNull()
      .references(() => gradingSchemes.id),
    title: varchar('title', { length: 120 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    configuredById: uuid('configured_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    termClassSubjectUnique: uniqueIndex('exam_configs_term_class_subject_unique').on(
      table.tenantId,
      table.termId,
      table.classArmId,
      table.subjectId,
    ),
    tenantTermIdx: index('exam_configs_tenant_term_idx').on(table.tenantId, table.termId),
    statusValid: check('exam_configs_status_valid', sql`${table.status} IN ('draft', 'open', 'closed')`),
  }),
);

/**
 * Gradebook entries (SRS §4.5 / US-ACA-003). Teachers may create/update only for
 * their own active subject assignments; Class Teachers get read-only access.
 */
export const gradebookEntries = academicSchema.table(
  'gradebook_entries',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id),
    classArmId: uuid('class_arm_id')
      .notNull()
      .references(() => classArms.id),
    subjectId: uuid('subject_id').notNull(),
    studentId: uuid('student_id').notNull(),
    examConfigId: uuid('exam_config_id')
      .notNull()
      .references(() => examConfigs.id),
    gradingSchemeId: uuid('grading_scheme_id')
      .notNull()
      .references(() => gradingSchemes.id),
    teacherStaffProfileId: uuid('teacher_staff_profile_id').notNull(),
    continuousAssessmentScore: integer('continuous_assessment_score').notNull(),
    examScore: integer('exam_score').notNull(),
    totalScore: integer('total_score').notNull(),
    grade: varchar('grade', { length: 10 }).notNull(),
    remark: varchar('remark', { length: 120 }),
    status: varchar('status', { length: 30 }).notNull().default('draft'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    correctedAt: timestamp('corrected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentSubjectUnique: uniqueIndex('gradebook_entries_student_subject_unique').on(
      table.tenantId,
      table.termId,
      table.classArmId,
      table.subjectId,
      table.studentId,
    ),
    termClassSubjectIdx: index('gradebook_entries_term_class_subject_idx').on(
      table.tenantId,
      table.termId,
      table.classArmId,
      table.subjectId,
    ),
    scoreRange: check(
      'gradebook_entries_score_range',
      sql`${table.continuousAssessmentScore} BETWEEN 0 AND 100 AND ${table.examScore} BETWEEN 0 AND 100 AND ${table.totalScore} BETWEEN 0 AND 100`,
    ),
    statusValid: check(
      'gradebook_entries_status_valid',
      sql`${table.status} IN ('draft', 'submitted', 'correction_pending', 'corrected')`,
    ),
  }),
);

/** Durable audit of grade corrections routed through Workflow (CON-004/005). */
export const gradeCorrectionLogs = academicSchema.table(
  'grade_correction_logs',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    gradebookEntryId: uuid('gradebook_entry_id')
      .notNull()
      .references(() => gradebookEntries.id),
    workflowInstanceId: uuid('workflow_instance_id').notNull(),
    previousContinuousAssessmentScore: integer('previous_continuous_assessment_score').notNull(),
    previousExamScore: integer('previous_exam_score').notNull(),
    previousTotalScore: integer('previous_total_score').notNull(),
    previousGrade: varchar('previous_grade', { length: 10 }).notNull(),
    newContinuousAssessmentScore: integer('new_continuous_assessment_score').notNull(),
    newExamScore: integer('new_exam_score').notNull(),
    newTotalScore: integer('new_total_score').notNull(),
    newGrade: varchar('new_grade', { length: 10 }).notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    requestedById: uuid('requested_by_id').notNull(),
    approvedById: uuid('approved_by_id'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workflowUnique: uniqueIndex('grade_correction_logs_workflow_instance_unique').on(
      table.workflowInstanceId,
    ),
    entryStatusIdx: index('grade_correction_logs_entry_status_idx').on(
      table.tenantId,
      table.gradebookEntryId,
      table.status,
    ),
    statusValid: check(
      'grade_correction_logs_status_valid',
      sql`${table.status} IN ('pending', 'approved', 'rejected', 'returned')`,
    ),
    scoreRange: check(
      'grade_correction_logs_score_range',
      sql`${table.previousContinuousAssessmentScore} BETWEEN 0 AND 100
        AND ${table.previousExamScore} BETWEEN 0 AND 100
        AND ${table.previousTotalScore} BETWEEN 0 AND 100
        AND ${table.newContinuousAssessmentScore} BETWEEN 0 AND 100
        AND ${table.newExamScore} BETWEEN 0 AND 100
        AND ${table.newTotalScore} BETWEEN 0 AND 100`,
    ),
  }),
);

/**
 * Published result headers (SRS §4.5 / US-ACA-004). Publishing requires step-up
 * MFA at the route and records one result per student/term.
 */
export const results = academicSchema.table(
  'results',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id),
    classArmId: uuid('class_arm_id')
      .notNull()
      .references(() => classArms.id),
    studentId: uuid('student_id').notNull(),
    averageScore: integer('average_score').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('published'),
    publishedById: uuid('published_by_id').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentTermUnique: uniqueIndex('results_student_term_unique').on(
      table.tenantId,
      table.termId,
      table.studentId,
    ),
    termClassIdx: index('results_term_class_idx').on(table.tenantId, table.termId, table.classArmId),
    averageRange: check('results_average_score_range', sql`${table.averageScore} BETWEEN 0 AND 100`),
    statusValid: check('results_status_valid', sql`${table.status} IN ('published', 'withdrawn')`),
  }),
);

/**
 * Attendance records (SRS §4.5 FR-ACA-002; CON-003; US-ACA-005). One row per
 * student per session per day. Attendance marking is EXCLUSIVELY a Class Teacher
 * capability — enforced at the route (requireRole('class_teacher')) and again in
 * the service layer; regular Teachers have no attendance access at all.
 *
 * Offline entries captured on the mobile app arrive via the sync endpoint signed
 * with a per-tenant device key (see `attendanceDeviceKeys`); `source`,
 * `deviceId`, `signatureVerified`, and `capturedAt` record that provenance. A
 * submitted day's record may be amended only within the same day; each amendment
 * stores `previousStatus`/`amendmentReason`/`amendedAt` and increments
 * `amendmentCount`, and is additionally written to the immutable audit log.
 *
 * `studentId` / `markedByStaffProfileId` reference the Student and HRM modules and
 * are stored without DB FKs (cross-module), mirroring the existing gradebook rows.
 */
export const attendanceRecords = academicSchema.table(
  'attendance_records',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id),
    classArmId: uuid('class_arm_id')
      .notNull()
      .references(() => classArms.id),
    studentId: uuid('student_id').notNull(),
    attendanceDate: date('attendance_date').notNull(),
    session: varchar('session', { length: 20 }).notNull().default('full_day'),
    status: varchar('status', { length: 20 }).notNull(),
    source: varchar('source', { length: 20 }).notNull().default('online'),
    deviceId: uuid('device_id'),
    signatureVerified: boolean('signature_verified').notNull().default(false),
    markedByStaffProfileId: uuid('marked_by_staff_profile_id').notNull(),
    markedByUserId: uuid('marked_by_user_id').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    amendedAt: timestamp('amended_at', { withTimezone: true }),
    amendedByUserId: uuid('amended_by_user_id'),
    previousStatus: varchar('previous_status', { length: 20 }),
    amendmentReason: varchar('amendment_reason', { length: 500 }),
    amendmentCount: integer('amendment_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    studentSessionUnique: uniqueIndex('attendance_records_student_session_unique').on(
      table.tenantId,
      table.termId,
      table.classArmId,
      table.studentId,
      table.attendanceDate,
      table.session,
    ),
    classDateIdx: index('attendance_records_class_date_idx').on(
      table.tenantId,
      table.termId,
      table.classArmId,
      table.attendanceDate,
    ),
    studentIdx: index('attendance_records_student_idx').on(
      table.tenantId,
      table.termId,
      table.studentId,
    ),
    statusValid: check(
      'attendance_records_status_valid',
      sql`${table.status} IN ('present', 'absent', 'late', 'excused')`,
    ),
    sessionValid: check(
      'attendance_records_session_valid',
      sql`${table.session} IN ('morning', 'afternoon', 'full_day')`,
    ),
    sourceValid: check(
      'attendance_records_source_valid',
      sql`${table.source} IN ('online', 'offline_sync')`,
    ),
  }),
);

/**
 * Per-tenant device signing keys (MOB-007). The mobile client generates an ECDSA
 * P-256 key pair, keeps the private key in the device secure keystore, and
 * registers the SPKI public key here. The server verifies offline attendance
 * signatures against this key at sync time. A revoked key can no longer sync.
 */
export const attendanceDeviceKeys = academicSchema.table(
  'attendance_device_keys',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    deviceId: uuid('device_id').notNull(),
    publicKeyPem: varchar('public_key_pem', { length: 2000 }).notNull(),
    label: varchar('label', { length: 120 }),
    registeredByUserId: uuid('registered_by_user_id').notNull(),
    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One ACTIVE signing key per device; a revoked key can be replaced (rotation).
    tenantDeviceActiveUnique: uniqueIndex('attendance_device_keys_tenant_device_active_unique')
      .on(table.tenantId, table.deviceId)
      .where(sql`${table.revoked} = false`),
    tenantDeviceIdx: index('attendance_device_keys_tenant_device_idx').on(
      table.tenantId,
      table.deviceId,
    ),
  }),
);

/**
 * Timetable period slots (SRS §4.5 FR-ACA-001; US-ACA-006). The set of rows for a
 * (term, class arm) is the class timetable. Conflict detection (a teacher or class
 * arm double-booked in an overlapping window on the same weekday) runs in the
 * service before insert and refuses to save on conflict. Times are stored as
 * minutes-from-midnight so overlap maths is exact and timezone-free.
 */
export const timetables = academicSchema.table(
  'timetables',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id),
    classArmId: uuid('class_arm_id')
      .notNull()
      .references(() => classArms.id),
    subjectId: uuid('subject_id').notNull(),
    teacherStaffProfileId: uuid('teacher_staff_profile_id').notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    classDayIdx: index('timetables_class_day_idx').on(
      table.tenantId,
      table.termId,
      table.classArmId,
      table.dayOfWeek,
    ),
    teacherDayIdx: index('timetables_teacher_day_idx').on(
      table.tenantId,
      table.termId,
      table.teacherStaffProfileId,
      table.dayOfWeek,
    ),
    dayValid: check('timetables_day_valid', sql`${table.dayOfWeek} BETWEEN 1 AND 7`),
    timeValid: check(
      'timetables_time_valid',
      sql`${table.startMinute} >= 0 AND ${table.startMinute} < 1440 AND ${table.endMinute} > ${table.startMinute} AND ${table.endMinute} <= 1440`,
    ),
    statusValid: check('timetables_status_valid', sql`${table.status} IN ('draft', 'published', 'marked_for_removal')`),
  }),
);

/**
 * School-day bell schedule per academic year (start times, period length, breaks).
 * Timetable grids and conflict detection use these slots instead of hardcoded presets.
 */
export const bellSchedules = academicSchema.table(
  'bell_schedules',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id),
    slots: jsonb('slots').notNull(),
    updatedById: uuid('updated_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantYearUid: uniqueIndex('bell_schedules_tenant_year_uidx').on(table.tenantId, table.academicYearId),
  }),
);

/**
 * Assignments (SRS §4.5 FR-ACA-003; US-ACA-007). A Teacher creates an assignment
 * for their own assigned subject/class (verified at the service layer against the
 * HRM subject assignment). `instructions` is stored as a long varchar to avoid a
 * separate `text` import; it is bounded by the Zod contract.
 */
export const assignments = academicSchema.table(
  'assignments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => academicTerms.id),
    classArmId: uuid('class_arm_id')
      .notNull()
      .references(() => classArms.id),
    subjectId: uuid('subject_id').notNull(),
    teacherStaffProfileId: uuid('teacher_staff_profile_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    instructions: varchar('instructions', { length: 5000 }).notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    maxScore: integer('max_score').notNull().default(100),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    createdById: uuid('created_by_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    classSubjectIdx: index('assignments_class_subject_idx').on(
      table.tenantId,
      table.termId,
      table.classArmId,
      table.subjectId,
    ),
    classStatusIdx: index('assignments_class_status_idx').on(
      table.tenantId,
      table.classArmId,
      table.status,
    ),
    statusValid: check(
      'assignments_status_valid',
      sql`${table.status} IN ('draft', 'published', 'closed')`,
    ),
    maxScoreValid: check('assignments_max_score_valid', sql`${table.maxScore} > 0`),
  }),
);

/**
 * Assignment submissions (SRS §4.5 FR-ACA-003; US-ACA-007). One row per student
 * per assignment. A submission after the assignment due date is flagged `isLate`
 * automatically by the service. Teachers grade against the individual submission.
 */
export const submissions = academicSchema.table(
  'submissions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id),
    studentId: uuid('student_id').notNull(),
    content: varchar('content', { length: 10000 }),
    storageObjectId: uuid('storage_object_id'),
    status: varchar('status', { length: 20 }).notNull().default('submitted'),
    isLate: boolean('is_late').notNull().default(false),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    score: integer('score'),
    feedback: varchar('feedback', { length: 2000 }),
    gradedByStaffProfileId: uuid('graded_by_staff_profile_id'),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assignmentStudentUnique: uniqueIndex('submissions_assignment_student_unique').on(
      table.tenantId,
      table.assignmentId,
      table.studentId,
    ),
    assignmentStatusIdx: index('submissions_assignment_status_idx').on(
      table.tenantId,
      table.assignmentId,
      table.status,
    ),
    statusValid: check(
      'submissions_status_valid',
      sql`${table.status} IN ('submitted', 'late', 'graded', 'returned')`,
    ),
    scoreValid: check('submissions_score_valid', sql`${table.score} IS NULL OR ${table.score} >= 0`),
  }),
);
