import { LoomisError } from '../../../shared/errors.js';
import { parentDashboardRepository, regionalAnalyticsRepository } from '../repository/index.js';

export interface ActorContext {
  userId: string;
  role: string;
  tenantId: string | null;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const parentDashboardReadService = {
  async getDashboard(actor: ActorContext) {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
    }
    return parentDashboardRepository.listForParent(actor.userId);
  },
};

export const regionalAnalyticsReadService = {
  async getDashboard(actor: ActorContext, region?: string) {
    if (actor.role !== 'regional_manager' && actor.role !== 'regional_subordinate') {
      throw new LoomisError('FORBIDDEN', 403, 'Regional role required');
    }

    const snapshotDate = todayDate();
    const tenants = region
      ? await regionalAnalyticsRepository.listByRegion(region, snapshotDate)
      : await regionalAnalyticsRepository.listForSnapshot(snapshotDate);

    const totals = tenants.reduce(
      (acc, row) => ({
        totalStudents: acc.totalStudents + row.totalStudents,
        activeEnrollments: acc.activeEnrollments + row.activeEnrollments,
        feeCollectedMinor: acc.feeCollectedMinor + row.feeCollectedMinor,
      }),
      { totalStudents: 0, activeEnrollments: 0, feeCollectedMinor: 0 },
    );

    return { region: region ?? null, snapshotDate, tenants, totals };
  },
};
