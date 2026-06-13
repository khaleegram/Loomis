import type { FastifyInstance } from 'fastify';
import { parentTimetableQuery, type ParentTimetableQuery } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateQuery } from '../../../shared/validation.js';
import {
  getParentDashboardHandler,
  getParentTimetableHandler,
  getRegionalAnalyticsHandler,
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
