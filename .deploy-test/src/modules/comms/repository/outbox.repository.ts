import { outboxEvents } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { OutboxEventInput } from '../types.js';

export const commsOutboxRepository = {
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
    if (!row) throw new Error('Failed to append comms outbox event');
    return row;
  },

  async publish(event: OutboxEventInput) {
    return withTenantContext(event.tenantId, async (tx) => this.append(tx, event));
  },
};
