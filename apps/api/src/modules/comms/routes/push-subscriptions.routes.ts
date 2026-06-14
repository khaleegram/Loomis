import type { FastifyInstance } from 'fastify';
import {
  registerPushSubscriptionRequest,
  type RegisterPushSubscriptionRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  deregisterPushSubscriptionHandler,
  getWebPushConfigHandler,
  listPushSubscriptionsHandler,
  registerPushSubscriptionHandler,
} from '../handlers/index.js';

/** Push subscription routes (SRS §10.4 / US-COM-004). */
export async function pushSubscriptionsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/comms/push/config',
    { preHandler: [authenticate] },
    getWebPushConfigHandler,
  );

  app.post<{ Body: RegisterPushSubscriptionRequest }>(
    '/comms/push-subscriptions',
    {
      preHandler: [authenticate, requireTenantMatch, requireIdempotencyKey],
      preValidation: [validateBody(registerPushSubscriptionRequest)],
    },
    registerPushSubscriptionHandler,
  );

  app.get(
    '/comms/push-subscriptions',
    { preHandler: [authenticate, requireTenantMatch] },
    listPushSubscriptionsHandler,
  );

  app.delete<{ Params: { subscriptionId: string } }>(
    '/comms/push-subscriptions/:subscriptionId',
    { preHandler: [authenticate, requireTenantMatch] },
    deregisterPushSubscriptionHandler,
  );
}
