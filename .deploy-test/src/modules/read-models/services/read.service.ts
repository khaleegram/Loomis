import { LoomisError } from '../../../shared/errors.js';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { attendanceService } from '../../academic/services/attendance.service.js';
import { parentDashboardRepository, regionalAnalyticsRepository } from '../repository/index.js';

export interface ActorContext {
  userId: string;
  role: string;
  tenantId: string | null;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function resolveOpenTermId(tenantId: string): Promise<string | null> {
  const years = await academicRepository.listYears(tenantId);
  const year = years.find((y) => y.status === 'active') ?? years[0];
  if (!year) return null;

  const terms = await academicRepository.listTermsByYear(tenantId, year.id);
  const term =
    terms.find((t) => t.status === 'open') ??
    terms.find((t) => t.status === 'census_locked') ??
    terms[0];
  return term?.id ?? null;
}

async function liveAttendanceSummary(
  tenantId: string,
  studentId: string,
  actor: ActorContext,
): Promise<{ presentCount: number; totalCount: number; lastStatus: string | null } | null> {
  try {
    const termId = await resolveOpenTermId(tenantId);
    if (!termId) return null;

    const result = await attendanceService.listParentChildAttendance(
      tenantId,
      studentId,
      termId,
      actor,
    );
    const { summary } = result;
    const total = summary.present + summary.absent + summary.late + summary.excused;
    if (total === 0) return null;

    const lastRecord = result.records.at(-1);
    return {
      presentCount: summary.present + summary.late,
      totalCount: total,
      lastStatus: lastRecord?.status ?? null,
    };
  } catch {
    return null;
  }
}

export const parentDashboardReadService = {
  async getDashboard(actor: ActorContext) {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
    }

    const cards = await parentDashboardRepository.listForParent(actor.userId);
    return Promise.all(
      cards.map(async (card) => {
        const live = await liveAttendanceSummary(card.tenantId, card.studentId, actor);
        if (!live) return card;
        return { ...card, attendanceSummary: live };
      }),
    );
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
