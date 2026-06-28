import type { FastifyInstance } from 'fastify';
import {
  teachingRosterQuery,
  teachingStaffContextQuery,
  type TeachingRosterQuery,
  type TeachingStaffContextQuery,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireSchoolStaff } from '../../../middleware/require-school-staff.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateQuery } from '../../../shared/validation.js';
import {
  getTeachingRosterHandler,
  getTeachingStaffContextHandler,
} from '../handlers/academic-ops.handler.js';

const teachingAdmins = ['school_owner', 'principal', 'admin_officer'] as const;

export async function teachingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string }; Querystring: TeachingStaffContextQuery }>(
    '/tenants/:tenantId/teaching/me',
    {
      preHandler: [authenticate, requireTenantMatch, requireSchoolStaff()],
      preValidation: [validateQuery(teachingStaffContextQuery)],
    },
    getTeachingStaffContextHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: TeachingRosterQuery }>(
    '/tenants/:tenantId/teaching/roster',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...teachingAdmins)],
      preValidation: [validateQuery(teachingRosterQuery)],
    },
    getTeachingRosterHandler,
  );
}
