import type { FastifyInstance } from 'fastify';
import { teachingStaffContextQuery, type TeachingStaffContextQuery } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateQuery } from '../../../shared/validation.js';
import { getTeachingStaffContextHandler } from '../handlers/academic-ops.handler.js';

const teachingStaff = ['teacher', 'class_teacher'] as const;

export async function teachingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string }; Querystring: TeachingStaffContextQuery }>(
    '/tenants/:tenantId/teaching/me',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...teachingStaff)],
      preValidation: [validateQuery(teachingStaffContextQuery)],
    },
    getTeachingStaffContextHandler,
  );
}
