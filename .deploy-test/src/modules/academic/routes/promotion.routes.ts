import type { FastifyInstance } from 'fastify';
import {
  confirmPromotionRequest,
  stagePromotionRequest,
  type ConfirmPromotionRequest,
  type StagePromotionRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  confirmPromotionsHandler,
  listPromotionsHandler,
  stagePromotionsHandler,
} from '../handlers/index.js';

// FR-ASM-007: Principal or Admin Officer stage; Principal confirms.
const promotionStagers = ['school_owner', 'principal', 'admin_officer'] as const;
const promotionConfirmers = ['school_owner', 'principal'] as const;

/** Student promotion & graduation routes (FR-ASM-007/008; US-ASM-005/006). */
export async function promotionRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: StagePromotionRequest }>(
    '/tenants/:tenantId/promotions',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...promotionStagers)],
      preValidation: [validateBody(stagePromotionRequest)],
    },
    stagePromotionsHandler,
  );

  app.get<{ Params: { tenantId: string; yearId: string } }>(
    '/tenants/:tenantId/academic-years/:yearId/promotions',
    { preHandler: [authenticate, requireTenantMatch, requireRole(...promotionStagers)] },
    listPromotionsHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: ConfirmPromotionRequest }>(
    '/tenants/:tenantId/promotions/confirm',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...promotionConfirmers)],
      preValidation: [validateBody(confirmPromotionRequest)],
    },
    confirmPromotionsHandler,
  );
}
