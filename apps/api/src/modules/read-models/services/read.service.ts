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
    if (!region) {
      throw new LoomisError('VALIDATION_ERROR', 422, 'Region query parameter is required');
    }

    const snapshotDate = todayDate();
    const tenants = await regionalAnalyticsRepository.listByRegion(region, snapshotDate);

    const totals = tenants.reduce(
      (acc, row) => ({
        totalStudents: acc.totalStudents + row.totalStudents,
        activeEnrollments: acc.activeEnrollments + row.activeEnrollments,
        feeCollectedMinor: acc.feeCollectedMinor + row.feeCollectedMinor,
      }),
      { totalStudents: 0, activeEnrollments: 0, feeCollectedMinor: 0 },
    );

    return { region, snapshotDate, tenants, totals };
  },
};
