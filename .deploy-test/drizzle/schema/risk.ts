import { sql } from 'drizzle-orm';
import {
  bigint,
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

export const riskSchema = pgSchema('risk');

/** IVP signal types aligned with System Design §8.2 anomaly inputs. */
export const IVP_SIGNAL_TYPES = [
  'attendance_anomaly',
  'gradebook_anomaly',
  'payment_volume',
  'device_count',
  'parent_link',
] as const;

export type IvpSignalType = (typeof IVP_SIGNAL_TYPES)[number];

/**
 * Daily IVP signal snapshots (Revenue Integrity §IVP). INSERT-only after creation.
 * `signal_value` stores the raw metric (counts or ratio × 1000 as integer).
 */
export const ivpSignalSnapshots = riskSchema.table(
  'ivp_signal_snapshots',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id').notNull(),
    snapshotDate: varchar('snapshot_date', { length: 10 }).notNull(),
    signalType: varchar('signal_type', { length: 35 }).notNull(),
    signalValue: bigint('signal_value', { mode: 'number' }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantDateTypeUnique: uniqueIndex('ivp_signal_snapshots_tenant_term_date_type_unique').on(
      table.tenantId,
      table.termId,
      table.snapshotDate,
      table.signalType,
    ),
    tenantDateIdx: index('ivp_signal_snapshots_tenant_date_idx').on(
      table.tenantId,
      table.snapshotDate,
    ),
    signalTypeValid: check(
      'ivp_signal_snapshots_signal_type_valid',
      sql`${table.signalType} IN (
        'attendance_anomaly', 'gradebook_anomaly', 'payment_volume',
        'device_count', 'parent_link'
      )`,
    ),
  }),
);

/**
 * IVP anomaly cases (System Design §8.2). Opened when composite score exceeds 2.0.
 * Active cases hold referral earnings until resolved.
 */
export const ivpAnomalyCases = riskSchema.table(
  'ivp_anomaly_cases',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id').notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
    reportedEnrollment: integer('reported_enrollment').notNull(),
    estimatedMin: integer('estimated_min').notNull(),
    estimatedMax: integer('estimated_max').notNull(),
    anomalyScore: integer('anomaly_score_milli').notNull(),
    priority: varchar('priority', { length: 10 }).notNull().default('standard'),
    signalsAnalyzed: jsonb('signals_analyzed').$type<Record<string, unknown>>().notNull(),
    caseStatus: varchar('case_status', { length: 25 }).notNull().default('OPEN'),
    assignedToId: uuid('assigned_to_id'),
    resolutionNotes: text('resolution_notes'),
    resolvedById: uuid('resolved_by_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantStatusIdx: index('ivp_anomaly_cases_tenant_status_idx').on(
      table.tenantId,
      table.caseStatus,
    ),
    scoreIdx: index('ivp_anomaly_cases_score_idx').on(table.anomalyScore),
    termOpenIdx: index('ivp_anomaly_cases_term_status_idx').on(table.termId, table.caseStatus),
    statusValid: check(
      'ivp_anomaly_cases_status_valid',
      sql`${table.caseStatus} IN (
        'OPEN', 'INVESTIGATING', 'RESOLVED_EXPLAINED',
        'RESOLVED_CORRECTED', 'RESOLVED_ENFORCED', 'DISMISSED'
      )`,
    ),
    priorityValid: check(
      'ivp_anomaly_cases_priority_valid',
      sql`${table.priority} IN ('watchlist', 'standard', 'urgent')`,
    ),
  }),
);

/**
 * Privileged platform change requests (SRS FR-PLT-007 / CON-013). Dual approval
 * enforced in the service layer — requester cannot approve their own request.
 */
export const privilegedChangeRequests = riskSchema.table(
  'privileged_change_requests',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    changeType: varchar('change_type', { length: 35 }).notNull(),
    targetTenantId: uuid('target_tenant_id').references(() => tenants.id),
    requestedByUserId: uuid('requested_by_user_id').notNull(),
    approvedByUserId: uuid('approved_by_user_id'),
    status: varchar('status', { length: 15 }).notNull().default('requested'),
    beforeJson: jsonb('before_json').$type<Record<string, unknown>>().notNull(),
    afterJson: jsonb('after_json').$type<Record<string, unknown>>().notNull(),
    reason: text('reason').notNull(),
    riskScore: integer('risk_score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    executedAt: timestamp('executed_at', { withTimezone: true }),
  },
  (table) => ({
    typeStatusIdx: index('privileged_change_requests_type_status_idx').on(
      table.changeType,
      table.status,
    ),
    tenantIdx: index('privileged_change_requests_tenant_idx').on(
      table.targetTenantId,
      table.createdAt,
    ),
    requesterIdx: index('privileged_change_requests_requester_idx').on(
      table.requestedByUserId,
      table.createdAt,
    ),
    changeTypeValid: check(
      'privileged_change_requests_change_type_valid',
      sql`${table.changeType} IN (
        'psf_rate_override', 'psf_waiver', 'ledger_adjustment',
        'tenant_suspension_override', 'referral_rule_change',
        'support_impersonation', 'data_export'
      )`,
    ),
    statusValid: check(
      'privileged_change_requests_status_valid',
      sql`${table.status} IN ('requested', 'approved', 'rejected', 'executed', 'expired')`,
    ),
  }),
);

/**
 * Break-glass support sessions (SEC-004). 30-minute expiry; requires support
 * ticket ID. Platform Admin only; School Owner notified on activation.
 */
export const breakGlassSessions = riskSchema.table(
  'break_glass_sessions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    supportUserId: uuid('support_user_id').notNull(),
    supportTicketId: varchar('support_ticket_id', { length: 64 }).notNull(),
    status: varchar('status', { length: 15 }).notNull().default('active'),
    activatedAt: timestamp('activated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ownerNotifiedAt: timestamp('owner_notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantActiveIdx: index('break_glass_sessions_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
    supportUserIdx: index('break_glass_sessions_support_user_idx').on(table.supportUserId),
    statusValid: check(
      'break_glass_sessions_status_valid',
      sql`${table.status} IN ('active', 'expired', 'revoked')`,
    ),
  }),
);
