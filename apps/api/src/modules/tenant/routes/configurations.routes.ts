import type { FastifyInstance } from 'fastify';
import { upsertConfigurationRequest, type UpsertConfigurationRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  listConfigurationsHandler,
  upsertConfigurationHandler,
} from '../handlers/index.js';

/** Tenant configuration routes (platform-managed key/value). Under /api/v1. */
export async function configurationsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/configurations',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    listConfigurationsHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpsertConfigurationRequest }>(
    '/tenants/:tenantId/configurations',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(upsertConfigurationRequest)],
    },
    upsertConfigurationHandler,
  );
}
