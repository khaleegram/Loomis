import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ParentTimetableQuery } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { LoomisError } from '../../../shared/errors.js';
import { timetableEntryToResponse } from '../../academic/handlers/_ops-serializers.js';
import { timetableService } from '../../academic/services/timetable.service.js';
import { parentDashboardReadService, regionalAnalyticsReadService } from '../services/index.js';

function requireActor(req: FastifyRequest) {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  return { userId: user.sub, role: user.role, tenantId: user.tenantId };
}

function cardToResponse(row: {
  id: string;
  tenantId: string;
  studentId: string;
  schoolName: string;
  studentFirstName: string;
  classArmLabel: string | null;
  attendanceSummary: { presentCount: number; totalCount: number; lastStatus: string | null };
  latestResultSummary: { termId: string | null; averageScore: number | null } | null;
  outstandingBalanceMinor: number;
  unreadMessageCount: number;
  linkStatus: string;
  lastRefreshedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    studentId: row.studentId,
    schoolName: row.schoolName,
    studentFirstName: row.studentFirstName,
    classArmLabel: row.classArmLabel,
    attendanceSummary: row.attendanceSummary,
    latestResultSummary: row.latestResultSummary,
    outstandingBalanceMinor: row.outstandingBalanceMinor,
    unreadMessageCount: row.unreadMessageCount,
    linkStatus: row.linkStatus,
    lastRefreshedAt: row.lastRefreshedAt.toISOString(),
  };
}

export async function getParentDashboardHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const cards = await parentDashboardReadService.getDashboard(requireActor(req));
  return sendSuccess(reply, { cards: cards.map(cardToResponse) });
}

export async function getParentTimetableHandler(
  req: FastifyRequest<{ Querystring: ParentTimetableQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const tenantId = req.headers['x-tenant-id'];
  if (typeof tenantId !== 'string' || !tenantId) {
    throw new LoomisError('VALIDATION_ERROR', 400, 'X-Tenant-Id header is required');
  }

  const result = await timetableService.listParentChildTimetable(
    tenantId,
    req.query.studentId,
    req.query.termId,
    requireActor(req),
  );

  return sendSuccess(reply, {
    entries: result.entries.map(timetableEntryToResponse),
    classArmId: result.classArmId,
    classArmLabel: result.classArmLabel,
  });
}

export async function getRegionalAnalyticsHandler(
  req: FastifyRequest<{ Querystring: { region?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const data = await regionalAnalyticsReadService.getDashboard(
    requireActor(req),
    req.query.region,
  );
  return sendSuccess(reply, {
    region: data.region,
    snapshotDate: data.snapshotDate,
    tenants: data.tenants.map((row) => ({
      tenantId: row.tenantId,
      region: row.region,
      snapshotDate: row.snapshotDate,
      totalStudents: row.totalStudents,
      activeEnrollments: row.activeEnrollments,
      attendanceRateMilli: row.attendanceRateMilli,
      feeCollectionRateMilli: row.feeCollectionRateMilli,
      feeCollectedMinor: row.feeCollectedMinor,
      psfCollectedMinor: row.psfCollectedMinor,
    })),
    totals: data.totals,
  });
}
