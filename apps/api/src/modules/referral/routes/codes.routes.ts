import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { getMyCodeHandler, regenerateCodeHandler } from '../handlers/index.js';

/** Referral code routes (US-REF-002 / FR-REF-003). */
export async function codesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/platform/referral/codes/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
      ],
    },
    getMyCodeHandler,
  );

  app.post(
    '/platform/referral/codes/regenerate',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
        requireIdempotencyKey,
      ],
    },
    regenerateCodeHandler,
  );
}
