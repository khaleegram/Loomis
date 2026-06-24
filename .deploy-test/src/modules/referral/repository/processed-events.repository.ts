import { eq } from 'drizzle-orm';
import { referralProcessedEvents } from '../../../../drizzle/schema/referral.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const processedEventsRepository = {
  async claim(tx: Executor, eventId: string, eventType: string): Promise<boolean> {
    const rows = await tx
      .insert(referralProcessedEvents)
      .values({ eventId, eventType })
      .onConflictDoNothing()
      .returning({ eventId: referralProcessedEvents.eventId });
    return rows.length > 0;
  },

  async isProcessed(eventId: string): Promise<boolean> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({ eventId: referralProcessedEvents.eventId })
        .from(referralProcessedEvents)
        .where(eq(referralProcessedEvents.eventId, eventId))
        .limit(1);
      return Boolean(row);
    });
  },
};
