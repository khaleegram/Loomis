import { sql } from 'drizzle-orm';
import { retentionEvents } from '../../../../drizzle/schema/compliance.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import {
  breachRepository,
  consentRepository,
  dsarRepository,
  retentionRepository,
} from '../repository/index.js';
import type { ActorContext } from '../types.js';

function requireDpo(actor: ActorContext): void {
  if (actor.role !== 'dpo') {
    throw new LoomisError('FORBIDDEN', 403, 'DPO role required');
  }
}

export const dashboardService = {
  async getPosture(actor: ActorContext) {
    requireDpo(actor);

    return withTenantContext(null, async (tx) => {
      const [
        activeDsarCount,
        overdueDsarCount,
        openBreachCount,
        pendingNdpcRows,
        activeConsent,
        retentionSchedules,
        recentEvents,
      ] = await Promise.all([
        dsarRepository.countActive(tx),
        dsarRepository.countOverdue(tx),
        breachRepository.countOpen(tx),
        breachRepository.listPendingNdpc(tx),
        consentRepository.findActive(tx),
        retentionRepository.listSchedules(tx),
        tx
          .select({ count: sql<number>`count(*)::int` })
          .from(retentionEvents)
          .where(sql`${retentionEvents.performedAt} > now() - interval '30 days'`),
      ]);

      return {
        activeDsarCount,
        overdueDsarCount,
        openBreachCount,
        pendingNdpcNotificationCount: pendingNdpcRows.length,
        activeConsentVersion: activeConsent,
        retentionSchedules,
        recentRetentionEvents: recentEvents[0]?.count ?? 0,
      };
    });
  },
};
