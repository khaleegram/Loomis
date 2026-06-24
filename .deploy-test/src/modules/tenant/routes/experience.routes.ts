import type { FastifyInstance } from 'fastify';
import {
  updateTenantExperienceRequest,
  type UpdateTenantExperienceRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getTenantExperienceHandler,
  updateTenantExperienceHandler,
} from '../handlers/experience.handler.js';

const EXPERIENCE_READERS = [
  'school_owner',
  'principal',
  'admin_officer',
  'accountant',
  'cashier',
  'exam_officer',
  'deputy_exam_officer',
  'timetable_officer',
  'teacher',
  'class_teacher',
  'platform_owner',
  'platform_admin',
  'dpo',
] as const;

/** Tenant role-experience tier (ROLE_EXPERIENCE_TIER_PLAN.md Sprint 1). */
export async function experienceRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/experience',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...EXPERIENCE_READERS)],
    },
    getTenantExperienceHandler,
  );

  app.patch<{ Params: { tenantId: string }; Body: UpdateTenantExperienceRequest }>(
    '/tenants/:tenantId/experience',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'school_owner'),
      ],
      preValidation: [validateBody(updateTenantExperienceRequest)],
    },
    updateTenantExperienceHandler,
  );
}
