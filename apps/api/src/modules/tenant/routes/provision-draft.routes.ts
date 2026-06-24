import type { FastifyInstance } from 'fastify';
import {
  upsertProvisionDraftRequest,
  type UpsertProvisionDraftRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  deletePlatformProvisionDraftHandler,
  deleteRegionalProvisionDraftHandler,
  getPlatformProvisionDraftHandler,
  getRegionalProvisionDraftHandler,
  upsertPlatformProvisionDraftHandler,
  upsertRegionalProvisionDraftHandler,
} from '../handlers/index.js';

export async function provisionDraftRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/platform/provision-drafts/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'regional_manager', 'regional_subordinate'),
      ],
    },
    getPlatformProvisionDraftHandler,
  );

  app.put<{ Body: UpsertProvisionDraftRequest }>(
    '/platform/provision-drafts/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'regional_manager', 'regional_subordinate'),
      ],
      preValidation: [validateBody(upsertProvisionDraftRequest)],
    },
    upsertPlatformProvisionDraftHandler,
  );

  app.delete(
    '/platform/provision-drafts/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'regional_manager', 'regional_subordinate'),
      ],
    },
    deletePlatformProvisionDraftHandler,
  );

  app.get(
    '/regional/provision-drafts/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate', 'platform_owner', 'platform_admin'),
      ],
    },
    getRegionalProvisionDraftHandler,
  );

  app.put<{ Body: UpsertProvisionDraftRequest }>(
    '/regional/provision-drafts/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate', 'platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(upsertProvisionDraftRequest)],
    },
    upsertRegionalProvisionDraftHandler,
  );

  app.delete(
    '/regional/provision-drafts/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate', 'platform_owner', 'platform_admin'),
      ],
    },
    deleteRegionalProvisionDraftHandler,
  );
}
