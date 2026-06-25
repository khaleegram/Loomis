import type { FastifyInstance } from 'fastify';
import {
  migrateProductTierRequest,
  type MigrateProductTierRequest,
  provisionTenantRequest,
  type ProvisionTenantRequest,
  reinstateTenantRequest,
  suspendTenantRequest,
  type SuspendTenantRequest,
  updateTenantContactsRequest,
  type UpdateTenantContactsRequest,
  updateTenantProfileRequest,
  type UpdateTenantProfileRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getTenantHandler,
  listTenantsHandler,
  listTiersHandler,
  migrateProductTierHandler,
  provisionTenantHandler,
  reinstateTenantHandler,
  resendTenantSetupEmailHandler,
  suspendTenantHandler,
  updateTenantContactsHandler,
  updateTenantProfileHandler,
} from '../handlers/index.js';

/**
 * Platform console tenant routes (US-PLT-001/002).
 * Paths match `packages/api-client` platform hooks (`/platform/tenants`, `/platform/tiers`).
 */
export async function platformTenantsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/platform/tenants',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    listTenantsHandler,
  );

  app.get(
    '/platform/tiers',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    listTiersHandler,
  );

  app.post<{ Body: ProvisionTenantRequest }>(
    '/platform/tenants',
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
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(provisionTenantRequest)],
    },
    provisionTenantHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/platform/tenants/:tenantId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    getTenantHandler,
  );

  app.patch<{ Params: { tenantId: string }; Body: UpdateTenantProfileRequest }>(
    '/platform/tenants/:tenantId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(updateTenantProfileRequest)],
    },
    updateTenantProfileHandler,
  );

  app.patch<{ Params: { tenantId: string }; Body: UpdateTenantContactsRequest }>(
    '/platform/tenants/:tenantId/contacts',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
      preValidation: [validateBody(updateTenantContactsRequest)],
    },
    updateTenantContactsHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: MigrateProductTierRequest }>(
    '/platform/tenants/:tenantId/migrate-tier',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireStepUp('psf_rate_change'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(migrateProductTierRequest)],
    },
    migrateProductTierHandler,
  );

  app.post<{ Params: { tenantId: string } }>(
    '/platform/tenants/:tenantId/resend-setup-email',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
    },
    resendTenantSetupEmailHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: SuspendTenantRequest }>(
    '/platform/tenants/:tenantId/suspend',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(suspendTenantRequest)],
    },
    suspendTenantHandler,
  );

  app.post<{ Params: { tenantId: string } }>(
    '/platform/tenants/:tenantId/reinstate',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(reinstateTenantRequest)],
    },
    reinstateTenantHandler,
  );
}
