import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { getMyEarningsHandler, getMyEarningsSummaryHandler } from '../handlers/index.js';

/** Participant earnings dashboard (US-REG-004 / FR-REG-004). */
export async function earningsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/platform/referral/earnings/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
      ],
    },
    getMyEarningsHandler,
  );

  app.get(
    '/platform/referral/earnings/me/summary',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
      ],
    },
    getMyEarningsSummaryHandler,
  );
}
