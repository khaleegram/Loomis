import type { FastifyInstance } from 'fastify';
import { teachingStaffContextQuery, type TeachingStaffContextQuery } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireSchoolStaff } from '../../../middleware/require-school-staff.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateQuery } from '../../../shared/validation.js';
import { getTeachingStaffContextHandler } from '../handlers/academic-ops.handler.js';

export async function teachingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string }; Querystring: TeachingStaffContextQuery }>(
    '/tenants/:tenantId/teaching/me',
    {
      preHandler: [authenticate, requireTenantMatch, requireSchoolStaff()],
      preValidation: [validateQuery(teachingStaffContextQuery)],
    },
    getTeachingStaffContextHandler,
  );
}
