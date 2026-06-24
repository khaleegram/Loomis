import type { FastifyInstance } from 'fastify';
import {
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
  getGlobalPsfHistoryHandler,
  getTenantPsfHistoryHandler,
  requestPsfRateOverrideHandler,
  setGlobalPsfRateHandler,
} from '../handlers/index.js';

/**
 * PSF rate management routes (US-PLT-003/004; FR-PLT-002). All under /api/v1.
 * Rate changes require step-up MFA; per-school overrides additionally require
 * two-person approval (enforced via the workflow hook in the service layer).
 */
export async function psfRateRoutes(app: FastifyInstance): Promise<void> {
  // Static segment precedes the `:tenantId` param routes — set the global default.
  app.post<{ Body: SetGlobalPsfRateRequest }>(
    '/tenants/psf-rate/global',
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
    '/tenants/psf-rate/global/history',
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
    '/tenants/:tenantId/psf-rate/override',
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

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/psf-rate/history',
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
