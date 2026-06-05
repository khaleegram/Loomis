import {
  index,
  jsonb,
  pgSchema,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

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
    // The relay scans for unpublished rows in insertion order (id is UUIDv7).
    unpublishedIdx: index('outbox_events_published_at_id_idx').on(table.publishedAt, table.id),
    eventTypeIdx: index('outbox_events_event_type_idx').on(table.eventType),
  }),
);
