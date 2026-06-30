import { sql } from 'drizzle-orm';
import {
  bigint,
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

/**
 * Payments (SRS §4.6 FR-FIN-004/005; US-FIN-002..004; System Design §9).
 * Offline payments start in `pending_verification` (Cashier log); online payments
 * start `pending` until a verified gateway webhook confirms settlement. Only
 * `verified` payments settle invoice balances and emit `payment.verified` for
 * the Ledger module to apply PSF settlements.
 *
 * Amounts are BIGINT kobo. `logged_by_id` is the Cashier (offline) or Parent
 * (online init). `verified_by_id` is the Accountant (offline verify) or null
 * when gateway-confirmed. Segregation of duties: the Cashier who logged CANNOT
 * verify the same payment (enforced in the service layer).
 */
export const payments = financeSchema.table(
  'payments',
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
    termId: uuid('term_id').notNull(),
    studentId: uuid('student_id').notNull(),
    channel: varchar('channel', { length: 20 }).notNull(),
    method: varchar('method', { length: 30 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 30 }).notNull().default('pending_verification'),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    loggedById: uuid('logged_by_id').notNull(),
    verifiedById: uuid('verified_by_id'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    paymentDate: date('payment_date').notNull(),
    channelReference: varchar('channel_reference', { length: 120 }),
    evidenceStorageObjectId: uuid('evidence_storage_object_id'),
    gatewayProvider: varchar('gateway_provider', { length: 20 }),
    gatewayReference: varchar('gateway_reference', { length: 120 }),
    gatewayAuthorizationUrl: varchar('gateway_authorization_url', { length: 2000 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdempotencyUnique: uniqueIndex('payments_tenant_idempotency_unique').on(
      table.tenantId,
      table.idempotencyKey,
    ),
    tenantInvoiceIdx: index('payments_tenant_invoice_idx').on(table.tenantId, table.invoiceId),
    tenantStudentIdx: index('payments_tenant_student_idx').on(table.tenantId, table.studentId),
    tenantStatusIdx: index('payments_tenant_status_idx').on(table.tenantId, table.status),
    gatewayReferenceIdx: index('payments_gateway_reference_idx').on(
      table.gatewayProvider,
      table.gatewayReference,
    ),
    channelValid: check('payments_channel_valid', sql`${table.channel} IN ('offline', 'online')`),
    amountPositive: check('payments_amount_positive', sql`${table.amountMinor} > 0`),
    statusValid: check(
      'payments_status_valid',
      sql`${table.status} IN ('pending_verification', 'pending', 'verified', 'failed', 'cancelled')`,
    ),
  }),
);

/**
 * Receipts (FR-FIN-004 / FR-RIN-007). Issued on offline log as `provisional`;
 * promoted to `final` on Accountant verification or immediately `final` for
 * gateway-confirmed online payments. Sequence numbers are immutable and
 * gapless per (tenant, term) — enforced in the service layer.
 */
export const receipts = financeSchema.table(
  'receipts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id),
    termId: uuid('term_id').notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('provisional'),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    lineItems: jsonb('line_items').$type<Array<Record<string, unknown>>>().notNull(),
    issuedById: uuid('issued_by_id').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    paymentUnique: uniqueIndex('receipts_payment_unique').on(table.paymentId),
    tenantTermSequenceUnique: uniqueIndex('receipts_tenant_term_sequence_unique').on(
      table.tenantId,
      table.termId,
      table.sequenceNumber,
    ),
    tenantTermIdx: index('receipts_tenant_term_idx').on(table.tenantId, table.termId),
    statusValid: check(
      'receipts_status_valid',
      sql`${table.status} IN ('provisional', 'final')`,
    ),
    amountPositive: check('receipts_amount_positive', sql`${table.amountMinor} > 0`),
    sequencePositive: check('receipts_sequence_positive', sql`${table.sequenceNumber} > 0`),
  }),
);

/**
 * Gateway webhook event log (SRS §10.1 / SEC-WH-001..003; System Design §9.2).
 * GLOBAL table — no tenant RLS. Idempotent on (provider, provider_event_id).
 * Signature verification happens BEFORE insert; duplicates short-circuit with
 * no business logic. Downstream processing is driven by the outbox relay.
 */
export const webhookEvents = financeSchema.table(
  'webhook_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    provider: varchar('provider', { length: 20 }).notNull(),
    providerEventId: varchar('provider_event_id', { length: 120 }).notNull(),
    eventType: varchar('event_type', { length: 80 }).notNull(),
    signatureValid: boolean('signature_valid').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: varchar('status', { length: 20 }).notNull().default('received'),
    providerTimestamp: timestamp('provider_timestamp', { withTimezone: true }),
    tenantId: uuid('tenant_id'),
    paymentId: uuid('payment_id'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerEventUnique: uniqueIndex('webhook_events_provider_event_unique').on(
      table.provider,
      table.providerEventId,
    ),
    statusIdx: index('webhook_events_status_idx').on(table.status, table.createdAt),
    providerValid: check(
      'webhook_events_provider_valid',
      sql`${table.provider} IN ('paystack', 'nomba')`,
    ),
    statusValid: check(
      'webhook_events_status_valid',
      sql`${table.status} IN ('received', 'processed', 'duplicate', 'rejected')`,
    ),
  }),
);

/**
 * Refund requests (SRS §4.6 FR-FIN-007; US-FIN-006). Cashier initiates; approval
 * flows through Workflow (`refund_request`: Accountant → Principal → Owner).
 * PSF is NOT reversed on school-fee refunds. PSF reversal is a separate platform
 * workflow (`psf_reversal_on_refund`) for duplicate/error/chargeback/legal only.
 */
export const refundRequests = financeSchema.table(
  'refund_requests',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id),
    termId: uuid('term_id').notNull(),
    studentId: uuid('student_id').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    reasonCode: varchar('reason_code', { length: 30 }).notNull(),
    reasonNotes: varchar('reason_notes', { length: 1000 }),
    psfTreatment: varchar('psf_treatment', { length: 30 }).notNull().default('not_reversed'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    workflowInstanceId: uuid('workflow_instance_id').notNull(),
    psfReversalWorkflowId: uuid('psf_reversal_workflow_id'),
    requestedById: uuid('requested_by_id').notNull(),
    approvedById: uuid('approved_by_id'),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantStatusIdx: index('refund_requests_tenant_status_idx').on(table.tenantId, table.status),
    paymentIdx: index('refund_requests_payment_idx').on(table.tenantId, table.paymentId),
    workflowUnique: uniqueIndex('refund_requests_workflow_unique').on(table.workflowInstanceId),
    amountPositive: check('refund_requests_amount_positive', sql`${table.amountMinor} > 0`),
    reasonValid: check(
      'refund_requests_reason_valid',
      sql`${table.reasonCode} IN (
        'duplicate', 'overpayment', 'student_withdrawal',
        'service_failure', 'chargeback', 'platform_error', 'legal_compulsion'
      )`,
    ),
    psfTreatmentValid: check(
      'refund_requests_psf_treatment_valid',
      sql`${table.psfTreatment} IN ('not_reversed', 'reversal_pending', 'reversed')`,
    ),
    statusValid: check(
      'refund_requests_status_valid',
      sql`${table.status} IN ('pending', 'approved', 'rejected', 'executed', 'cancelled')`,
    ),
  }),
);

/**
 * Gateway reconciliation exceptions (SRS §10.1; US-FIN-007). Created by the nightly
 * BullMQ job when gateway settlement records diverge from internal payment records.
 * `tenant_id` is populated when the exception can be tied to a platform payment.
 */
export const reconciliationExceptions = financeSchema.table(
  'reconciliation_exceptions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    provider: varchar('provider', { length: 20 }).notNull(),
    exceptionType: varchar('exception_type', { length: 30 }).notNull(),
    gatewayReference: varchar('gateway_reference', { length: 120 }),
    paymentId: uuid('payment_id').references(() => payments.id),
    gatewayAmountMinor: bigint('gateway_amount_minor', { mode: 'number' }),
    platformAmountMinor: bigint('platform_amount_minor', { mode: 'number' }),
    settlementDate: date('settlement_date').notNull(),
    reconciliationRunId: uuid('reconciliation_run_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    resolutionNotes: varchar('resolution_notes', { length: 1000 }),
    resolvedById: uuid('resolved_by_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantStatusIdx: index('reconciliation_exceptions_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
    runIdx: index('reconciliation_exceptions_run_idx').on(table.reconciliationRunId),
    providerReferenceIdx: index('reconciliation_exceptions_provider_ref_idx').on(
      table.provider,
      table.gatewayReference,
    ),
    providerValid: check(
      'reconciliation_exceptions_provider_valid',
      sql`${table.provider} IN ('paystack', 'nomba')`,
    ),
    exceptionTypeValid: check(
      'reconciliation_exceptions_type_valid',
      sql`${table.exceptionType} IN ('gateway_only', 'platform_only', 'amount_mismatch')`,
    ),
    statusValid: check(
      'reconciliation_exceptions_status_valid',
      sql`${table.status} IN ('open', 'resolved', 'ignored')`,
    ),
  }),
);

/**
 * Prepaid fee credit per student (pay-ahead surplus). Applied automatically when
 * new term invoices are issued.
 */
export const studentFeeCredits = financeSchema.table(
  'student_fee_credits',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    studentId: uuid('student_id').notNull(),
    balanceMinor: bigint('balance_minor', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: uniqueIndex('student_fee_credits_pk').on(table.tenantId, table.studentId),
    balanceNonNegative: check(
      'student_fee_credits_balance_non_negative',
      sql`${table.balanceMinor} >= 0`,
    ),
  }),
);

/**
 * Persistent Nomba virtual account per student (hackathon / US-FIN-004 bank transfer).
 * One static NUBAN per (tenant, student) for parent fee collection.
 */
export const studentVirtualAccounts = financeSchema.table(
  'student_virtual_accounts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    studentId: uuid('student_id').notNull(),
    provider: varchar('provider', { length: 20 }).notNull().default('nomba'),
    accountRef: varchar('account_ref', { length: 120 }).notNull(),
    accountNumber: varchar('account_number', { length: 20 }).notNull(),
    bankName: varchar('bank_name', { length: 120 }).notNull(),
    accountName: varchar('account_name', { length: 200 }).notNull(),
    nombaAccountHolderId: varchar('nomba_account_holder_id', { length: 80 }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantStudentUnique: uniqueIndex('student_virtual_accounts_tenant_student_unique').on(
      table.tenantId,
      table.studentId,
    ),
    accountRefUnique: uniqueIndex('student_virtual_accounts_account_ref_unique').on(table.accountRef),
    accountNumberIdx: index('student_virtual_accounts_account_number_idx').on(table.accountNumber),
    providerValid: check(
      'student_virtual_accounts_provider_valid',
      sql`${table.provider} IN ('nomba')`,
    ),
    statusValid: check(
      'student_virtual_accounts_status_valid',
      sql`${table.status} IN ('active', 'suspended')`,
    ),
  }),
);
