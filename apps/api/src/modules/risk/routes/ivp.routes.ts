import type { FastifyInstance } from 'fastify';
import {
  requestIvpRecountRequest,
  updateIvpCaseRequest,
  type RequestIvpRecountRequest,
  type UpdateIvpCaseRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getIvpCaseHandler,
  listPlatformIvpCasesHandler,
  listTenantIvpCasesHandler,
  requestIvpRecountHandler,
  updateIvpCaseHandler,
} from '../handlers/index.js';

/** IVP anomaly case routes (US-REV-003 / US-PLT-007; System Design §8.2). */
export async function ivpRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { status?: string } }>(
    '/platform/ivp/anomalies',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    listPlatformIvpCasesHandler,
  );

  app.get<{ Params: { caseId: string } }>(
    '/platform/ivp/anomalies/:caseId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    getIvpCaseHandler,
  );

  app.patch<{ Params: { caseId: string }; Body: UpdateIvpCaseRequest }>(
    '/platform/ivp/anomalies/:caseId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(updateIvpCaseRequest)],
    },
    updateIvpCaseHandler,
  );

  app.post<{ Params: { caseId: string }; Body: RequestIvpRecountRequest }>(
    '/platform/ivp/anomalies/:caseId/recount',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(requestIvpRecountRequest)],
    },
    requestIvpRecountHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/ivp/cases',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'platform_owner', 'platform_admin'),
      ],
    },
    listTenantIvpCasesHandler,
  );

  app.get<{ Params: { tenantId: string; caseId: string } }>(
    '/tenants/:tenantId/ivp/cases/:caseId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'platform_owner', 'platform_admin'),
      ],
    },
    getIvpCaseHandler,
  );
}
