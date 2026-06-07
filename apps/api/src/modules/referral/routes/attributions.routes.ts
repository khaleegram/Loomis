import type { FastifyInstance } from 'fastify';
import {
  validateReferralCodeRequest,
  type ValidateReferralCodeRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getTenantAttributionHandler,
  listAttributionsHandler,
  validateReferralCodeHandler,
} from '../handlers/index.js';

/** Attribution map routes (US-REF-003 / CON-009). */
export async function attributionsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: ValidateReferralCodeRequest }>(
    '/platform/referral/codes/validate',
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
      preValidation: [validateBody(validateReferralCodeRequest)],
    },
    validateReferralCodeHandler,
  );

  app.get<{ Querystring: { status?: string } }>(
    '/platform/referral/attributions',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    listAttributionsHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/platform/referral/attributions/:tenantId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    getTenantAttributionHandler,
  );
}
