import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import {
  checkTenantCapHandler,
  closePayoutCycleHandler,
  getPayoutCycleHandler,
  listPayoutCyclesHandler,
} from '../handlers/index.js';

/** Payout cycle routes (US-REF-004 / FR-REF-004..007). */
export async function payoutCyclesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/platform/referral/payout-cycles',
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
    },
    listPayoutCyclesHandler,
  );

  app.get<{ Params: { cycleId: string } }>(
    '/platform/referral/payout-cycles/:cycleId',
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
    },
    getPayoutCycleHandler,
  );

  app.post<{ Params: { cycleId: string } }>(
    '/platform/referral/payout-cycles/:cycleId/close',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
    },
    closePayoutCycleHandler,
  );

  app.get<{ Params: { cycleId: string; tenantId: string } }>(
    '/platform/referral/payout-cycles/:cycleId/tenants/:tenantId/cap-check',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    checkTenantCapHandler,
  );
}
