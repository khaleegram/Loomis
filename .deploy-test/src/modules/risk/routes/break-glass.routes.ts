import type { FastifyInstance } from 'fastify';
import {
  startBreakGlassRequest,
  type StartBreakGlassRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getActiveBreakGlassHandler,
  revokeBreakGlassHandler,
  startBreakGlassHandler,
} from '../handlers/index.js';

export async function breakGlassRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: StartBreakGlassRequest }>(
    '/platform/break-glass/sessions',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireStepUp('break_glass'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(startBreakGlassRequest)],
    },
    startBreakGlassHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/platform/break-glass/sessions/:tenantId/active',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    getActiveBreakGlassHandler,
  );

  app.delete<{ Params: { tenantId: string; sessionId: string } }>(
    '/platform/break-glass/sessions/:tenantId/:sessionId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
    },
    revokeBreakGlassHandler,
  );
}
