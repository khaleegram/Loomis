import { outboxEvents } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { OutboxEventInput } from '../types.js';

/**
 * Durable transactional outbox writer for the Finance module
 * (loomis-financial-integrity). `append` inserts the event using the CALLER's
 * transaction executor so the state change and the event commit atomically;
 * `publish` opens its own tenant-scoped transaction for standalone events.
 *
 * Rows land in `ledger.outbox_events`; the BullMQ relay (Ledger module) drains
 * them. There is exactly one delivery path — never also dispatch out-of-band.
 */
export const financeOutboxRepository = {
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
    if (!row) throw new Error('Failed to append finance outbox event');
    return row;
  },

  async publish(event: OutboxEventInput) {
    return withTenantContext(event.tenantId, async (tx) => this.append(tx, event));
  },
};
