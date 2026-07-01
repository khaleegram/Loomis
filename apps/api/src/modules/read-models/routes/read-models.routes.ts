import type { FastifyInstance } from 'fastify';
import { parentAttendanceQuery, parentFeesQuery, parentPaymentsQuery, parentResultsQuery, parentTimetableQuery, type ParentAttendanceQuery, type ParentFeesQuery, type ParentPaymentsQuery, type ParentResultsQuery, type ParentTimetableQuery } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateQuery } from '../../../shared/validation.js';
import {
  getParentAttendanceHandler,
  getParentDashboardHandler,
  getParentFeesHandler,
  getParentPaymentsHandler,
  getParentResultsHandler,
  getParentTimetableHandler,
  getRegionalAnalyticsHandler,
  postHackathonDemoResetFeesHandler,
} from '../handlers/read-models.handler.js';

/** Read-model query routes (System Design §6.2; FR-PAR-001 / FR-REG-004). */
export async function readModelsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/parents/me/dashboard',
    { preHandler: [authenticate, requireTenantMatch, requireRole('parent')] },
    getParentDashboardHandler,
  );

  app.get<{ Querystring: ParentTimetableQuery }>(
    '/parents/me/timetable',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent')],
      preValidation: [validateQuery(parentTimetableQuery)],
    },
    getParentTimetableHandler,
  );

  app.get<{ Querystring: ParentAttendanceQuery }>(
    '/parents/me/attendance',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent')],
      preValidation: [validateQuery(parentAttendanceQuery)],
    },
    getParentAttendanceHandler,
  );

  app.get<{ Querystring: ParentResultsQuery }>(
    '/parents/me/results',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent')],
      preValidation: [validateQuery(parentResultsQuery)],
    },
    getParentResultsHandler,
  );

  app.get<{ Querystring: ParentFeesQuery }>(
    '/parents/me/fees',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent')],
      preValidation: [validateQuery(parentFeesQuery)],
    },
    getParentFeesHandler,
  );

  app.get<{ Querystring: ParentPaymentsQuery }>(
    '/parents/me/payments',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent')],
      preValidation: [validateQuery(parentPaymentsQuery)],
    },
    getParentPaymentsHandler,
  );

  app.post<{ Querystring: ParentFeesQuery }>(
    '/parents/me/fees/hackathon-reset',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent')],
      preValidation: [validateQuery(parentFeesQuery)],
    },
    postHackathonDemoResetFeesHandler,
  );

  app.get<{ Querystring: { region?: string } }>(
    '/regional/analytics',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
      ],
    },
    getRegionalAnalyticsHandler,
  );
}
