import { sql } from 'drizzle-orm';
import type { PgTransactionConfig } from 'drizzle-orm/pg-core';
import { db, type DbTransaction } from './db.js';

/**
 * Runs `fn` with `app.current_tenant_id` bound for the duration of a single
 * database transaction, then hands the transaction executor to `fn` so every
 * query inside runs on the SAME connection that holds the setting.
 *
 * This is required for Row-Level Security to work under connection pooling
 * (PgBouncer transaction mode, loomis-database): the `set_config` and the
 * queries MUST share one connection, otherwise the RLS policy reads an empty
 * `current_setting('app.current_tenant_id')` and rejects/leaks rows. We use
 * `is_local = true` (transaction-scoped) so the setting is reset automatically
 * at COMMIT/ROLLBACK and never leaks to a recycled pooled connection.
 *
 * Callers MUST use the provided `tx` executor for their queries — using the
 * global `db` inside `fn` would run on a different connection and defeat RLS.
 *
 * `config` is forwarded to the underlying transaction. The census lock uses
 * `{ isolationLevel: 'serializable' }` so the whole PSF-obligation trigger is one
 * SERIALIZABLE unit (System Design §8.1) — drizzle issues `begin isolation level
 * serializable` before the `set_config`, which is the required ordering.
 */
export async function withTenantContext<T>(
  tenantId: string | null,
  fn: (tx: DbTransaction) => Promise<T>,
  config?: PgTransactionConfig,
): Promise<T> {
  return db.transaction(async (tx) => {
    if (tenantId === null) {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', '', true)`);
    } else {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    }
    return fn(tx);
  }, config);
}
