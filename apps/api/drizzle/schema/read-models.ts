import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
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

export const readModelsSchema = pgSchema('read_models');

/**
 * Parent multi-child dashboard cards (FR-PAR-001 / System Design §6.2).
 * One row per (parentUserId, tenantId, studentId) — no cross-tenant joins at read time.
 */
export const parentChildCards = readModelsSchema.table(
  'parent_child_cards',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parentUserId: uuid('parent_user_id').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    studentId: uuid('student_id').notNull(),
    schoolName: varchar('school_name', { length: 200 }).notNull(),
    studentFirstName: varchar('student_first_name', { length: 100 }).notNull(),
    classArmLabel: varchar('class_arm_label', { length: 80 }),
    attendanceSummary: jsonb('attendance_summary')
      .$type<{ presentCount: number; totalCount: number; lastStatus: string | null }>()
      .notNull()
      .default({ presentCount: 0, totalCount: 0, lastStatus: null }),
    latestResultSummary: jsonb('latest_result_summary').$type<{
      termId: string | null;
      averageScore: number | null;
    }>(),
    outstandingBalanceMinor: bigint('outstanding_balance_minor', { mode: 'number' })
      .notNull()
      .default(0),
    unreadMessageCount: integer('unread_message_count').notNull().default(0),
    linkStatus: varchar('link_status', { length: 25 }).notNull().default('active'),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    parentTenantStudentUnique: uniqueIndex('parent_child_cards_parent_tenant_student_unique').on(
      table.parentUserId,
      table.tenantId,
      table.studentId,
    ),
    parentUserIdx: index('parent_child_cards_parent_user_idx').on(table.parentUserId),
    linkStatusValid: check(
      'parent_child_cards_link_status_valid',
      sql`${table.linkStatus} IN ('initiated', 'active', 'expired', 'revoked')`,
    ),
  }),
);

/**
 * Regional analytics snapshots (FR-REG-004). Aggregated tenant metrics — no student PII.
 */
export const regionalTenantAnalytics = readModelsSchema.table(
  'regional_tenant_analytics',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    region: varchar('region', { length: 100 }).notNull(),
    snapshotDate: varchar('snapshot_date', { length: 10 }).notNull(),
    totalStudents: integer('total_students').notNull().default(0),
    activeEnrollments: integer('active_enrollments').notNull().default(0),
    attendanceRateMilli: integer('attendance_rate_milli').notNull().default(0),
    feeCollectionRateMilli: integer('fee_collection_rate_milli').notNull().default(0),
    feeCollectedMinor: bigint('fee_collected_minor', { mode: 'number' }).notNull().default(0),
    psfCollectedMinor: bigint('psf_collected_minor', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantDateUnique: uniqueIndex('regional_tenant_analytics_tenant_date_unique').on(
      table.tenantId,
      table.snapshotDate,
    ),
    regionDateIdx: index('regional_tenant_analytics_region_date_idx').on(
      table.region,
      table.snapshotDate,
    ),
  }),
);

/** Idempotency guard for read-model event consumers. */
export const readModelProcessedEvents = readModelsSchema.table(
  'processed_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    eventId: uuid('event_id').notNull(),
    eventType: varchar('event_type', { length: 80 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventUnique: uniqueIndex('read_models_processed_events_event_unique').on(table.eventId),
  }),
);
