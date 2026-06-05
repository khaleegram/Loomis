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

export const workflowSchema = pgSchema('workflow');

/** A single approver step in a template chain (stored as JSONB). */
export type ApproverChainStep = {
  role: string;
  timeoutHours: number | null;
  escalatesToRole: string | null;
};

/**
 * Configurable workflow templates (US-WRK-001 / FR-WFL-001).
 * `tenant_id` NULL = platform default; tenant rows override platform defaults
 * for school-scoped workflow types.
 */
export const workflowTemplates = workflowSchema.table(
  'workflow_templates',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id'),
    workflowType: varchar('workflow_type', { length: 80 }).notNull(),
    approverChain: jsonb('approver_chain').$type<ApproverChainStep[]>().notNull(),
    isMandatory: boolean('is_mandatory').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantTypeUnique: uniqueIndex('workflow_templates_tenant_type_unique').on(
      table.tenantId,
      table.workflowType,
    ),
    typeIdx: index('workflow_templates_workflow_type_idx').on(table.workflowType),
  }),
);

/**
 * A running workflow request. `tenant_id` is NULL for purely platform-scoped
 * workflows (e.g. ledger adjustment); set for school-scoped or tenant-targeted
 * platform actions (e.g. PSF rate override for a specific school).
 */
export const workflowInstances = workflowSchema.table(
  'workflow_instances',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id'),
    workflowType: varchar('workflow_type', { length: 80 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    requestedById: uuid('requested_by_id').notNull(),
    requestedByRole: varchar('requested_by_role', { length: 50 }).notNull(),
    subjectType: varchar('subject_type', { length: 50 }),
    subjectId: uuid('subject_id'),
    title: varchar('title', { length: 200 }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    currentStepSequence: integer('current_step_sequence').notNull().default(1),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantStatusIdx: index('workflow_instances_tenant_status_idx').on(table.tenantId, table.status),
    requesterIdx: index('workflow_instances_requested_by_idx').on(table.requestedById),
    typeIdx: index('workflow_instances_workflow_type_idx').on(table.workflowType),
    statusValid: check(
      'workflow_instances_status_valid',
      sql`${table.status} IN ('pending', 'approved', 'rejected', 'returned', 'cancelled')`,
    ),
  }),
);

/**
 * Sequential approval steps materialised at workflow start from the resolved
 * template chain. Only one step is `active` at a time.
 */
export const workflowSteps = workflowSchema.table(
  'workflow_steps',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id'),
    workflowInstanceId: uuid('workflow_instance_id')
      .notNull()
      .references(() => workflowInstances.id),
    sequence: integer('sequence').notNull(),
    approverRole: varchar('approver_role', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    timeoutHours: integer('timeout_hours'),
    escalatesToRole: varchar('escalates_to_role', { length: 50 }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    escalatedAt: timestamp('escalated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    instanceSequenceUnique: uniqueIndex('workflow_steps_instance_sequence_unique').on(
      table.workflowInstanceId,
      table.sequence,
    ),
    activeDueIdx: index('workflow_steps_active_due_idx').on(table.status, table.dueAt),
    statusValid: check(
      'workflow_steps_status_valid',
      sql`${table.status} IN ('pending', 'active', 'approved', 'rejected', 'returned', 'skipped', 'escalated')`,
    ),
    sequencePositive: check('workflow_steps_sequence_positive', sql`${table.sequence} > 0`),
  }),
);

/** Immutable record of each approver action (FR-WFL-003 / US-WRK-003). */
export const workflowDecisions = workflowSchema.table(
  'workflow_decisions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id'),
    workflowInstanceId: uuid('workflow_instance_id')
      .notNull()
      .references(() => workflowInstances.id),
    workflowStepId: uuid('workflow_step_id')
      .notNull()
      .references(() => workflowSteps.id),
    actorUserId: uuid('actor_user_id').notNull(),
    actorRole: varchar('actor_role', { length: 50 }).notNull(),
    decision: varchar('decision', { length: 20 }).notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    instanceIdx: index('workflow_decisions_instance_idx').on(table.workflowInstanceId),
    decisionValid: check(
      'workflow_decisions_decision_valid',
      sql`${table.decision} IN ('approve', 'reject', 'return')`,
    ),
  }),
);
