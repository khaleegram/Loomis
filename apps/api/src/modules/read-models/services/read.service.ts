import { eq } from 'drizzle-orm';
import { tenants } from '../../../../drizzle/schema/tenant.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { attendanceService } from '../../academic/services/attendance.service.js';
import { studentRepository } from '../../student/repository/student.repository.js';
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

async function loadTenantName(tenantId: string): Promise<string | null> {
  return withTenantContext(null, async (tx) => {
    const [row] = await tx
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return row?.name ?? null;
  });
}

export const parentDashboardReadService = {
  async getDashboard(actor: ActorContext) {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
    }

    const cards = await parentDashboardRepository.listForParent(actor.userId);
    const activeCards = [];

    for (const card of cards) {
      const linked = await studentRepository.hasActiveParentLink(
        card.tenantId,
        actor.userId,
        card.studentId,
      );
      if (!linked) {
        await withTenantContext(null, async (tx) => {
          await parentDashboardRepository.setLinkStatus(
            tx,
            actor.userId,
            card.tenantId,
            card.studentId,
            'revoked',
          );
        });
        continue;
      }
      activeCards.push(card);
    }

    return Promise.all(
      activeCards.map(async (card) => {
        const student = await studentRepository.findStudentById(card.tenantId, card.studentId);
        const studentLastName = student?.lastName ?? '';
        const studentDisplayName = `${card.studentFirstName} ${studentLastName}`.trim();
        const live = await liveAttendanceSummary(card.tenantId, card.studentId, actor);
        return {
          ...card,
          studentLastName,
          studentDisplayName,
          ...(live ? { attendanceSummary: live } : {}),
        };
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

    const tenantsWithNames = await Promise.all(
      tenants.map(async (row) => ({
        ...row,
        tenantName: (await loadTenantName(row.tenantId)) ?? 'School',
      })),
    );

    const totals = tenantsWithNames.reduce(
      (acc, row) => ({
        totalStudents: acc.totalStudents + row.totalStudents,
        activeEnrollments: acc.activeEnrollments + row.activeEnrollments,
        feeCollectedMinor: acc.feeCollectedMinor + row.feeCollectedMinor,
      }),
      { totalStudents: 0, activeEnrollments: 0, feeCollectedMinor: 0 },
    );

    return { region: region ?? null, snapshotDate, tenants: tenantsWithNames, totals };
  },
};
