import { eq } from 'drizzle-orm';
import { processedEvents } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const processedEventsRepository = {
  async claim(tx: Executor, eventId: string, eventType: string): Promise<boolean> {
    const rows = await tx
      .insert(processedEvents)
      .values({ eventId, eventType })
      .onConflictDoNothing()
      .returning({ eventId: processedEvents.eventId });
    return rows.length > 0;
  },

  async isProcessed(eventId: string): Promise<boolean> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({ eventId: processedEvents.eventId })
        .from(processedEvents)
        .where(eq(processedEvents.eventId, eventId))
        .limit(1);
      return Boolean(row);
    });
  },
};
