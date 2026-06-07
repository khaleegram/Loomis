import type { FastifyInstance } from 'fastify';
import {
  upsertNotificationTemplateRequest,
  type UpsertNotificationTemplateRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import { listTemplatesHandler, upsertTemplateHandler } from '../handlers/index.js';

/** Notification template configuration (SRS §10.3). */
export async function templatesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/comms/templates',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'platform_owner', 'platform_admin'),
      ],
    },
    listTemplatesHandler,
  );

  app.put<{
    Params: { tenantId: string; templateKey: string; channel: string };
    Body: UpsertNotificationTemplateRequest;
  }>(
    '/tenants/:tenantId/comms/templates/:templateKey/:channel',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal', 'platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(upsertNotificationTemplateRequest)],
    },
    upsertTemplateHandler,
  );
}
