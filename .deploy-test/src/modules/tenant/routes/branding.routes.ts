import type { FastifyInstance } from 'fastify';
import {
  updateSchoolBrandingRequest,
  type UpdateSchoolBrandingRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getSchoolBrandingHandler,
  updateSchoolBrandingHandler,
} from '../handlers/branding.handler.js';

const SCHOOL_BRANDING_READERS = [
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

const SCHOOL_BRANDING_WRITERS = [
  'school_owner',
  'principal',
  'admin_officer',
  'platform_owner',
  'platform_admin',
] as const;

/** School branding — logo used on report cards, app bar, and printable documents. */
export async function brandingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/branding',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...SCHOOL_BRANDING_READERS)],
    },
    getSchoolBrandingHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpdateSchoolBrandingRequest }>(
    '/tenants/:tenantId/branding',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...SCHOOL_BRANDING_WRITERS),
      ],
      preValidation: [validateBody(updateSchoolBrandingRequest)],
    },
    updateSchoolBrandingHandler,
  );
}
