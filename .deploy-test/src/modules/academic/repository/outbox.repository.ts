import { outboxEvents } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { OutboxEventInput } from '../types.js';

/**
 * Durable transactional outbox writer (loomis-financial-integrity).
 *
 * `append` inserts the event using the CALLER's transaction executor, so the
 * event and the state change commit atomically (the census lock relies on this).
 * `publish` opens its own tenant-scoped transaction for standalone lifecycle
 * events that are not part of a larger multi-statement write.
 *
 * There is exactly one delivery path: rows land in `ledger.outbox_events` and the
 * relay (built with the Ledger module) drains them. We never also dispatch
 * out-of-band, which would create a second, lossy path.
 */
export const outboxRepository = {
  async append(tx: Executor, event: OutboxEventInput) {
    const [row] = await tx
      .insert(outboxEvents)
      .values({
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        tenantId: event.tenantId,
        payload: event.payload,
      })
      .returning();
    if (!row) throw new Error('Failed to append outbox event');
    return row;
  },

  async publish(event: OutboxEventInput) {
    return withTenantContext(event.tenantId, async (tx) => this.append(tx, event));
  },
};
