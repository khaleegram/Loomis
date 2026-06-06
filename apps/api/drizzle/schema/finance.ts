import { sql } from 'drizzle-orm';
import {
  bigint,
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

export const financeSchema = pgSchema('finance');

/**
 * Fee structures (SRS §4.6 FR-FIN-001; US-FIN-001). One structure per
 * (tenant, term, class level): different class levels can carry different fee
 * schedules. The structure aggregates one or more named fee items
 * (`fee_structure_items`).
 *
 * `total_amount_minor` is a denormalised sum of the item amounts in kobo, kept
 * in sync inside the same transaction that writes the items, so the
 * outstanding-balance and invoicing paths never have to re-sum on read.
 *
 * Lifecycle: while the term is still `draft`, the Accountant edits the structure
 * freely. Once the term opens, an amendment requires Principal approval through
 * the Workflow module (`fee_structure_change`); `version` is bumped each time an
 * approved amendment is applied. Cross-module references (academic year, term,
 * class level) are stored as plain UUIDs without a DB FK — mirroring the
 * established convention for `student.enrollments.term_id` — so the modules stay
 * decoupled. Only `tenant_id` carries a real FK (it drives RLS).
 */
export const feeStructures = financeSchema.table(
  'fee_structures',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    academicYearId: uuid('academic_year_id').notNull(),
    termId: uuid('term_id').notNull(),
    classLevelId: uuid('class_level_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    version: integer('version').notNull().default(1),
    totalAmountMinor: bigint('total_amount_minor', { mode: 'number' }).notNull().default(0),
    createdById: uuid('created_by_id').notNull(),
    lastAmendedById: uuid('last_amended_by_id'),
    lastAmendmentWorkflowId: uuid('last_amendment_workflow_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    termClassUnique: uniqueIndex('fee_structures_tenant_term_class_unique').on(
      table.tenantId,
      table.termId,
      table.classLevelId,
    ),
    tenantTermIdx: index('fee_structures_tenant_term_idx').on(table.tenantId, table.termId),
    statusValid: check(
      'fee_structures_status_valid',
      sql`${table.status} IN ('draft', 'active', 'superseded')`,
    ),
    totalNonNegative: check(
      'fee_structures_total_non_negative',
      sql`${table.totalAmountMinor} >= 0`,
    ),
    versionPositive: check('fee_structures_version_positive', sql`${table.version} > 0`),
  }),
);

/**
 * Fee items (US-FIN-001) — e.g. tuition, development levy, uniform. Each amount
 * is stored as BIGINT kobo (loomis-financial-integrity: never FLOAT/DECIMAL for
 * money). Items are replaced wholesale when a structure is edited or an approved
 * amendment is applied.
 */
export const feeStructureItems = financeSchema.table(
  'fee_structure_items',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    feeStructureId: uuid('fee_structure_id')
      .notNull()
      .references(() => feeStructures.id),
    name: varchar('name', { length: 120 }).notNull(),
    category: varchar('category', { length: 40 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    structureIdx: index('fee_structure_items_tenant_structure_idx').on(
      table.tenantId,
      table.feeStructureId,
    ),
    amountPositive: check('fee_structure_items_amount_positive', sql`${table.amountMinor} > 0`),
  }),
);

/**
 * Student fee invoices (SRS §4.6; Data Model §6 "Fee Structure"/"Receipt";
 * US-FIN-005). One invoice per (tenant, term, student), snapshotting the fee
 * structure's items at issue time into `invoice_items` so later edits to the
 * structure never retroactively change an issued invoice.
 *
 * `amount_charged_minor`, `amount_paid_minor` and `balance_minor` are all BIGINT
 * kobo. `balance_minor` is maintained = charged − paid on every write so the
 * outstanding-balance query (US-FIN-005) is a simple indexed, tenant-scoped read
 * rather than an aggregate over payments. Payments themselves arrive in CHAT 11.
 */
export const invoices = financeSchema.table(
  'invoices',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    academicYearId: uuid('academic_year_id').notNull(),
    termId: uuid('term_id').notNull(),
    studentId: uuid('student_id').notNull(),
    enrollmentId: uuid('enrollment_id'),
    classLevelId: uuid('class_level_id').notNull(),
    feeStructureId: uuid('fee_structure_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('issued'),
    amountChargedMinor: bigint('amount_charged_minor', { mode: 'number' }).notNull(),
    amountPaidMinor: bigint('amount_paid_minor', { mode: 'number' }).notNull().default(0),
    balanceMinor: bigint('balance_minor', { mode: 'number' }).notNull(),
    dueDate: date('due_date'),
    issuedById: uuid('issued_by_id').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    termStudentUnique: uniqueIndex('invoices_tenant_term_student_unique').on(
      table.tenantId,
      table.termId,
      table.studentId,
    ),
    // Serves the US-FIN-005 outstanding-balance query: tenant-scoped, filterable
    // by class level and payment status, all from the leading index columns.
    tenantTermClassStatusIdx: index('invoices_tenant_term_class_status_idx').on(
      table.tenantId,
      table.termId,
      table.classLevelId,
      table.status,
    ),
    studentIdx: index('invoices_tenant_student_idx').on(table.tenantId, table.studentId),
    statusValid: check(
      'invoices_status_valid',
      sql`${table.status} IN ('draft', 'issued', 'partially_paid', 'paid', 'void')`,
    ),
    chargedNonNegative: check(
      'invoices_charged_non_negative',
      sql`${table.amountChargedMinor} >= 0`,
    ),
    paidNonNegative: check('invoices_paid_non_negative', sql`${table.amountPaidMinor} >= 0`),
    balanceConsistent: check(
      'invoices_balance_consistent',
      sql`${table.balanceMinor} = ${table.amountChargedMinor} - ${table.amountPaidMinor}`,
    ),
  }),
);

/**
 * Invoice line items — an immutable snapshot of the fee items charged on an
 * invoice at issue time. Amounts are BIGINT kobo.
 */
export const invoiceItems = financeSchema.table(
  'invoice_items',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id),
    name: varchar('name', { length: 120 }).notNull(),
    category: varchar('category', { length: 40 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdx: index('invoice_items_tenant_invoice_idx').on(table.tenantId, table.invoiceId),
    amountPositive: check('invoice_items_amount_positive', sql`${table.amountMinor} > 0`),
  }),
);
