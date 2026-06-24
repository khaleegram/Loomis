import type { FastifyInstance } from 'fastify';
import {
  applyTenantPsfRateRequest,
  type ApplyTenantPsfRateRequest,
  requestPsfRateOverrideRequest,
  type RequestPsfRateOverrideRequest,
  setGlobalPsfRateRequest,
  type SetGlobalPsfRateRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  applyTenantPsfRateHandler,
  getGlobalPsfHistoryHandler,
  getTenantPsfHistoryHandler,
  requestPsfRateOverrideHandler,
  setGlobalPsfRateHandler,
} from '../handlers/index.js';

/** Platform console PSF routes — paths match `packages/api-client` platform hooks. */
export async function platformPsfRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: SetGlobalPsfRateRequest }>(
    '/platform/psf-rates',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireStepUp('psf_rate_change'),
      ],
      preValidation: [validateBody(setGlobalPsfRateRequest)],
    },
    setGlobalPsfRateHandler,
  );

  app.get(
    '/platform/psf-rates/global/history',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    getGlobalPsfHistoryHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: RequestPsfRateOverrideRequest }>(
    '/platform/tenants/:tenantId/psf-rate/override',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireStepUp('psf_rate_change'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(requestPsfRateOverrideRequest)],
    },
    requestPsfRateOverrideHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: ApplyTenantPsfRateRequest }>(
    '/platform/tenants/:tenantId/psf-rate/apply',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireStepUp('psf_rate_change'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(applyTenantPsfRateRequest)],
    },
    applyTenantPsfRateHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/platform/tenants/:tenantId/psf-rate/history',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin', 'dpo'),
      ],
    },
    getTenantPsfHistoryHandler,
  );
}
