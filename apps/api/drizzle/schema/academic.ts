import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
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
