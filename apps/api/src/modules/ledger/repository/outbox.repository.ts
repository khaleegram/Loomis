import { and, asc, eq, isNull } from 'drizzle-orm';
import { outboxEvents } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { OutboxEventInput } from '../types.js';

export const ledgerOutboxRepository = {
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
    if (!row) throw new Error('Failed to append ledger outbox event');
    return row;
  },

  async listUnpublished(limit: number) {
    return withTenantContext(null, async (tx) =>
      tx
        .select()
        .from(outboxEvents)
        .where(isNull(outboxEvents.publishedAt))
        .orderBy(asc(outboxEvents.id))
        .limit(limit),
    );
  },

  async markPublished(tx: Executor, eventId: string) {
    await tx
      .update(outboxEvents)
      .set({ publishedAt: new Date() })
      .where(eq(outboxEvents.id, eventId));
  },
};
