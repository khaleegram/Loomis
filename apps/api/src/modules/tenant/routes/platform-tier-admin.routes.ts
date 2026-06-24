import type { FastifyInstance } from 'fastify';
import {
  createTierRequest,
  type CreateTierRequest,
  updateTierRequest,
  type UpdateTierRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import { createTierHandler, updateTierHandler } from '../handlers/index.js';

export async function platformTierAdminRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateTierRequest }>(
    '/platform/tiers',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(createTierRequest)],
    },
    createTierHandler,
  );

  app.patch<{ Params: { tierId: string }; Body: UpdateTierRequest }>(
    '/platform/tiers/:tierId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(updateTierRequest)],
    },
    updateTierHandler,
  );
}
