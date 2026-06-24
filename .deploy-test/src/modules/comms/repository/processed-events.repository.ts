import { eq } from 'drizzle-orm';
import { commsProcessedEvents } from '../../../../drizzle/schema/comms.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const processedEventsRepository = {
  async claim(tx: Executor, eventId: string, eventType: string): Promise<boolean> {
    const rows = await tx
      .insert(commsProcessedEvents)
      .values({ eventId, eventType })
      .onConflictDoNothing()
      .returning({ eventId: commsProcessedEvents.eventId });
    return rows.length > 0;
  },

  async isProcessed(eventId: string): Promise<boolean> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({ eventId: commsProcessedEvents.eventId })
        .from(commsProcessedEvents)
        .where(eq(commsProcessedEvents.eventId, eventId))
        .limit(1);
      return Boolean(row);
    });
  },
};
