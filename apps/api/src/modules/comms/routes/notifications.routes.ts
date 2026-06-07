import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { listNotificationsHandler, markNotificationReadHandler } from '../handlers/index.js';

/** In-app notification feed (FR-COM-002 / US-COM-004). */
export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/comms/notifications',
    { preHandler: [authenticate, requireTenantMatch] },
    listNotificationsHandler,
  );

  app.post<{ Params: { tenantId: string; notificationId: string } }>(
    '/tenants/:tenantId/comms/notifications/:notificationId/read',
    { preHandler: [authenticate, requireTenantMatch] },
    markNotificationReadHandler,
  );
}
