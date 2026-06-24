import type { FastifyInstance } from 'fastify';
import { createSubordinateRequest, type CreateSubordinateRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  createSubordinateHandler,
  ensureMyParticipantHandler,
  getMyParticipantHandler,
  listSubordinatesHandler,
} from '../handlers/index.js';

/** Referral participant routes (US-REG-002 / FR-REG-003). */
export async function participantsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/platform/referral/participants/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
      ],
    },
    getMyParticipantHandler,
  );

  app.post(
    '/platform/referral/participants/me/ensure',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
      ],
    },
    ensureMyParticipantHandler,
  );

  app.post<{ Body: CreateSubordinateRequest }>(
    '/platform/referral/participants/subordinates',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('regional_manager')],
      preValidation: [validateBody(createSubordinateRequest)],
    },
    createSubordinateHandler,
  );

  app.get(
    '/platform/referral/participants/subordinates',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('regional_manager')],
    },
    listSubordinatesHandler,
  );
}
