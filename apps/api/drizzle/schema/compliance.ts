import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { tenants } from './tenant';

export const complianceSchema = pgSchema('compliance');

/** Data categories aligned with System Design §19.2 retention engine. */
export const RETENTION_DATA_CATEGORIES = [
  'student_records',
  'financial_records',
  'audit_logs',
  'parent_pii',
  'staff_pii',
  'admission_records',
] as const;
export type RetentionDataCategory = (typeof RETENTION_DATA_CATEGORIES)[number];

export const DSAR_STATUSES = ['received', 'in_progress', 'responded', 'rejected'] as const;
export type DsarStatus = (typeof DSAR_STATUSES)[number];

export const DSAR_REQUESTER_TYPES = ['parent', 'student', 'staff', 'other'] as const;
export type DsarRequesterType = (typeof DSAR_REQUESTER_TYPES)[number];

export const BREACH_STATUSES = [
  'suspected',
  'confirmed',
  'contained',
  'ndpc_notified',
  'closed',
] as const;
export type BreachStatus = (typeof BREACH_STATUSES)[number];

export const RETENTION_EVENT_ACTIONS = ['anonymised', 'hard_deleted'] as const;
export type RetentionEventAction = (typeof RETENTION_EVENT_ACTIONS)[number];

/**
 * Data Subject Access Requests (System Design §19.3; US-AUD-002).
 * 30-day response deadline with escalation alerts at day 21 and 28.
 */
export const dsars = complianceSchema.table(
  'dsars',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    requesterType: varchar('requester_type', { length: 20 }).notNull(),
    requesterUserId: uuid('requester_user_id'),
    subjectUserId: uuid('subject_user_id'),
    subjectIdentifiers: jsonb('subject_identifiers')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    dataCategories: jsonb('data_categories').$type<string[]>().notNull().default([]),
    status: varchar('status', { length: 20 }).notNull().default('received'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    responseDeadlineAt: timestamp('response_deadline_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    respondedById: uuid('responded_by_id'),
    dataPackageJson: jsonb('data_package_json').$type<Record<string, unknown>>(),
    dataPackageObjectId: uuid('data_package_object_id'),
    redactionNotes: text('redaction_notes'),
    escalationDay21SentAt: timestamp('escalation_day21_sent_at', { withTimezone: true }),
    escalationDay28SentAt: timestamp('escalation_day28_sent_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusDeadlineIdx: index('dsars_status_deadline_idx').on(table.status, table.responseDeadlineAt),
    tenantStatusIdx: index('dsars_tenant_status_idx').on(table.tenantId, table.status),
    requesterTypeValid: check(
      'dsars_requester_type_valid',
      sql`${table.requesterType} IN ('parent', 'student', 'staff', 'other')`,
    ),
    statusValid: check(
      'dsars_status_valid',
      sql`${table.status} IN ('received', 'in_progress', 'responded', 'rejected')`,
    ),
  }),
);

/**
 * Data breach records (System Design §19.4; US-AUD-003).
 * 72-hour NDPC notification clock starts on DPO acknowledgement.
 */
export const breachRecords = complianceSchema.table(
  'breach_records',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgedById: uuid('acknowledged_by_id'),
    ndpcNotificationRequired: boolean('ndpc_notification_required'),
    ndpcNotificationDraft: jsonb('ndpc_notification_draft').$type<Record<string, unknown>>(),
    ndpcNotifiedAt: timestamp('ndpc_notified_at', { withTimezone: true }),
    ndpcNotificationOutcome: text('ndpc_notification_outcome'),
    ndpcDeadlineAt: timestamp('ndpc_deadline_at', { withTimezone: true }),
    breachType: varchar('breach_type', { length: 60 }).notNull(),
    affectedDataCategories: jsonb('affected_data_categories').$type<string[]>().notNull().default([]),
    estimatedSubjectCount: integer('estimated_subject_count').notNull().default(0),
    likelyCause: text('likely_cause').notNull(),
    containmentMeasures: text('containment_measures').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('suspected'),
    assignedDpoId: uuid('assigned_dpo_id'),
    escalation48hSentAt: timestamp('escalation_48h_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusDiscoveredIdx: index('breach_records_status_discovered_idx').on(
      table.status,
      table.discoveredAt,
    ),
    ndpcDeadlineIdx: index('breach_records_ndpc_deadline_idx').on(table.ndpcDeadlineAt),
    statusValid: check(
      'breach_records_status_valid',
      sql`${table.status} IN ('suspected', 'confirmed', 'contained', 'ndpc_notified', 'closed')`,
    ),
  }),
);

/**
 * Versioned privacy policy / consent templates (CMP-004; US-AUD-005).
 */
export const consentVersions = complianceSchema.table(
  'consent_versions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    versionLabel: varchar('version_label', { length: 40 }).notNull(),
    privacyPolicyHash: varchar('privacy_policy_hash', { length: 128 }).notNull(),
    contentSummary: text('content_summary').notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    publishedById: uuid('published_by_id').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    versionLabelUnique: uniqueIndex('consent_versions_version_label_unique').on(table.versionLabel),
    activeIdx: index('consent_versions_active_idx').on(table.isActive),
  }),
);

/**
 * Retention policy per data category (System Design §19.2).
 */
export const retentionSchedules = complianceSchema.table(
  'retention_schedules',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    dataCategory: varchar('data_category', { length: 40 }).notNull(),
    retentionDays: integer('retention_days').notNull(),
    anonymiseOnly: boolean('anonymise_only').notNull().default(false),
    description: text('description').notNull(),
    updatedById: uuid('updated_by_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    categoryUnique: uniqueIndex('retention_schedules_data_category_unique').on(table.dataCategory),
    retentionDaysPositive: check(
      'retention_schedules_retention_days_positive',
      sql`${table.retentionDays} > 0`,
    ),
    categoryValid: check(
      'retention_schedules_category_valid',
      sql`${table.dataCategory} IN (
        'student_records', 'financial_records', 'audit_logs',
        'parent_pii', 'staff_pii', 'admission_records'
      )`,
    ),
  }),
);

/**
 * Immutable log of retention actions (System Design §19.2). INSERT-only.
 */
export const retentionEvents = complianceSchema.table(
  'retention_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => retentionSchedules.id),
    dataCategory: varchar('data_category', { length: 40 }).notNull(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    targetSchema: varchar('target_schema', { length: 40 }).notNull(),
    targetTable: varchar('target_table', { length: 60 }).notNull(),
    targetRecordId: uuid('target_record_id').notNull(),
    action: varchar('action', { length: 15 }).notNull(),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => ({
    categoryActionIdx: index('retention_events_category_action_idx').on(
      table.dataCategory,
      table.action,
      table.performedAt,
    ),
    targetRecordIdx: index('retention_events_target_record_idx').on(
      table.targetSchema,
      table.targetTable,
      table.targetRecordId,
    ),
    hardDeleteEligibleIdx: index('retention_events_hard_delete_eligible_idx').on(
      table.action,
      table.performedAt,
    ),
    actionValid: check(
      'retention_events_action_valid',
      sql`${table.action} IN ('anonymised', 'hard_deleted')`,
    ),
  }),
);
