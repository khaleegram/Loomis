import type { FastifyInstance } from 'fastify';
import {
  closeTermRequest,
  configureTermRequest,
  type CloseTermRequest,
  type ConfigureTermRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  closeTermHandler,
  configureTermHandler,
  getTermHandler,
  listTermsHandler,
  openTermHandler,
} from '../handlers/index.js';

// FR-ASM-004: Principal, School Owner, or Timetable Officer configure a term.
const termConfigAdmins = ['school_owner', 'principal', 'timetable_officer'] as const;
// FR-ASM-005/006: Principal or School Owner open/close a term.
const termLifecycleAdmins = ['school_owner', 'principal'] as const;
const termReaders = [
  'school_owner',
  'principal',
  'admin_officer',
  'timetable_officer',
  'exam_officer',
  'teacher',
  'class_teacher',
] as const;

/** Academic term routes (FR-ASM-004/005/006; US-ASM-002/004). All under /api/v1. */
export async function termsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/terms',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...termReaders)] },
    listTermsHandler,
  );

  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...termReaders)] },
    getTermHandler,
  );

  app.patch<{ Params: { tenantId: string; termId: string }; Body: ConfigureTermRequest }>(
    '/tenants/:tenantId/terms/:termId',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...termConfigAdmins)],
      preValidation: [validateBody(configureTermRequest)],
    },
    configureTermHandler,
  );

  app.post<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/open',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...termLifecycleAdmins)] },
    openTermHandler,
  );

  app.post<{ Params: { tenantId: string; termId: string }; Body: CloseTermRequest }>(
    '/tenants/:tenantId/terms/:termId/close',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...termLifecycleAdmins)],
      preValidation: [validateBody(closeTermRequest)],
    },
    closeTermHandler,
  );
}
