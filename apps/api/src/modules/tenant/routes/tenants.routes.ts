import type { FastifyInstance } from 'fastify';
import {
  provisionTenantRequest,
  type ProvisionTenantRequest,
  reinstateTenantRequest,
  suspendTenantRequest,
  type SuspendTenantRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getTenantHandler,
  provisionTenantHandler,
  reinstateTenantHandler,
  suspendTenantHandler,
} from '../handlers/index.js';

/**
 * Tenant lifecycle routes (US-PLT-001/002). Registered under /api/v1.
 * Provisioning is open to platform admins and authorised regional actors
 * (FR-PLT-001); suspend/reinstate are platform-operations only.
 */
export async function tenantsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: ProvisionTenantRequest }>(
    '/tenants',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(
          'platform_owner',
          'platform_admin',
          'regional_manager',
          'regional_subordinate',
        ),
      ],
      preValidation: [validateBody(provisionTenantRequest)],
    },
    provisionTenantHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    getTenantHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: SuspendTenantRequest }>(
    '/tenants/:tenantId/suspend',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(suspendTenantRequest)],
    },
    suspendTenantHandler,
  );

  app.post<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/reinstate',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(reinstateTenantRequest)],
    },
    reinstateTenantHandler,
  );
}
