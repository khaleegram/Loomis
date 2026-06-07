import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  check,
  index,
  jsonb,
  pgSchema,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { psfRateSnapshots, tenants } from './tenant';

export const ledgerSchema = pgSchema('ledger');

/**
 * Transactional outbox (System Design §7/§8.1; loomis-financial-integrity).
 *
 * This is the cross-module integration backbone. A producer writes its state
 * change AND an `outbox_events` row in ONE transaction; a relay (BullMQ, built
 * with the Ledger module) later drains unpublished rows and dispatches them to
 * consumers. This guarantees a financial event is never lost because it was
 * published outside the transaction that committed the state change.
 *
 * It lives in the `ledger` schema because the Ledger module owns the outbox and
 * is the primary consumer (e.g. it consumes `academic.term.census_locked` to
 * create PSF obligations + double-entry ledger entries). The outbox is the one
 * table every module may write to from within its own transaction — that is the
 * sanctioned cross-module mechanism (loomis-module-patterns), so it is NOT under
 * tenant-isolation RLS: the relay must read across tenants. `tenant_id` is
 * carried on the row so the consumer can re-establish tenant context. No API
 * route ever reads this table directly.
 *
 * Rows are append-only except for `published_at`, which the relay stamps once.
 */
export const outboxEvents = ledgerSchema.table(
  'outbox_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    aggregateType: varchar('aggregate_type', { length: 50 }).notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    tenantId: uuid('tenant_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unpublishedIdx: index('outbox_events_published_at_id_idx').on(table.publishedAt, table.id),
    eventTypeIdx: index('outbox_events_event_type_idx').on(table.eventType),
  }),
);

/**
 * PSF obligations (Revenue Integrity §A / System Design §8.1).
 * Created ONLY when census locks or on late enrollment — never by payment.
 * Rows are INSERT-only after creation (loomis-financial-integrity).
 */
export const psfObligations = ledgerSchema.table(
  'psf_obligations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    termId: uuid('term_id').notNull(),
    studentId: uuid('student_id').notNull(),
    rateSnapshotId: uuid('rate_snapshot_id')
      .notNull()
      .references(() => psfRateSnapshots.id),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('NGN'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    liabilityReason: varchar('liability_reason', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantTermStudentUnique: uniqueIndex('psf_obligations_tenant_term_student_unique').on(
      table.tenantId,
      table.termId,
      table.studentId,
    ),
    tenantTermStatusIdx: index('psf_obligations_tenant_term_status_idx').on(
      table.tenantId,
      table.termId,
      table.status,
    ),
    termStatusIdx: index('psf_obligations_term_status_idx').on(table.termId, table.status),
    amountPositive: check('psf_obligations_amount_positive', sql`${table.amountMinor} > 0`),
    statusValid: check(
      'psf_obligations_status_valid',
      sql`${table.status} IN ('pending', 'settled', 'waived_pending', 'waived', 'disputed', 'written_off')`,
    ),
    liabilityReasonValid: check(
      'psf_obligations_liability_reason_valid',
      sql`${table.liabilityReason} IN ('census_locked', 'activity_inferred', 'late_enrollment', 'platform_adjustment')`,
    ),
  }),
);

/**
 * PSF settlements — payments applied against obligations (Revenue Integrity §A).
 * Settlement state is derived from these rows; obligations are never updated.
 */
export const psfSettlements = ledgerSchema.table(
  'psf_settlements',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    psfObligationId: uuid('psf_obligation_id')
      .notNull()
      .references(() => psfObligations.id),
    paymentId: uuid('payment_id').notNull(),
    settlementAmountMinor: bigint('settlement_amount_minor', { mode: 'number' }).notNull(),
    settlementSource: varchar('settlement_source', { length: 25 }).notNull(),
    settlementStatus: varchar('settlement_status', { length: 20 }).notNull().default('VERIFIED'),
    verifiedBy: uuid('verified_by'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    obligationIdx: index('psf_settlements_obligation_idx').on(table.psfObligationId),
    statusCreatedIdx: index('psf_settlements_status_created_idx').on(
      table.settlementStatus,
      table.createdAt,
    ),
    idempotencyUnique: uniqueIndex('psf_settlements_idempotency_unique').on(table.idempotencyKey),
    amountPositive: check(
      'psf_settlements_amount_positive',
      sql`${table.settlementAmountMinor} > 0`,
    ),
    sourceValid: check(
      'psf_settlements_source_valid',
      sql`${table.settlementSource} IN ('GATEWAY_SPLIT', 'OFFLINE_CASH', 'BANK_TRANSFER', 'MANUAL_ADJUSTMENT', 'BULK_RECONCILIATION')`,
    ),
    statusValid: check(
      'psf_settlements_status_valid',
      sql`${table.settlementStatus} IN ('PENDING', 'VERIFIED', 'REJECTED', 'REVERSED')`,
    ),
  }),
);

/**
 * Immutable double-entry ledger (System Design §8.3; Revenue Integrity §A).
 * INSERT-only at the application and database layer. Every `ledger_txn_id` group
 * must net to zero per currency — enforced in LedgerService.post().
 */
export const ledgerEntries = ledgerSchema.table(
  'ledger_entries',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    ledgerTxnId: uuid('ledger_txn_id').notNull(),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    accountCode: varchar('account_code', { length: 64 }).notNull(),
    direction: varchar('direction', { length: 6 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('NGN'),
    sourceType: varchar('source_type', { length: 25 }).notNull(),
    sourceId: uuid('source_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ledgerTxnIdx: index('ledger_entries_ledger_txn_idx').on(table.ledgerTxnId),
    tenantCreatedIdx: index('ledger_entries_tenant_created_idx').on(
      table.tenantId,
      table.createdAt,
    ),
    sourceIdx: index('ledger_entries_source_idx').on(table.sourceType, table.sourceId),
    accountCreatedIdx: index('ledger_entries_account_created_idx').on(
      table.accountCode,
      table.createdAt,
    ),
    directionValid: check(
      'ledger_entries_direction_valid',
      sql`${table.direction} IN ('debit', 'credit')`,
    ),
    amountPositive: check('ledger_entries_amount_positive', sql`${table.amountMinor} > 0`),
    sourceTypeValid: check(
      'ledger_entries_source_type_valid',
      sql`${table.sourceType} IN ('psf_obligation', 'payment', 'refund', 'referral_payout', 'admin_adjustment', 'chargeback')`,
    ),
  }),
);

/**
 * Consumer idempotency store (System Design §8.3 step 4). Each cross-module
 * event is recorded here before business logic runs; redeliveries are discarded.
 */
export const processedEvents = ledgerSchema.table(
  'processed_events',
  {
    eventId: uuid('event_id').primaryKey(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventTypeIdx: index('processed_events_event_type_idx').on(table.eventType),
  }),
);
