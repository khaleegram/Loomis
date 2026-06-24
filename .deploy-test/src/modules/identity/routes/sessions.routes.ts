import type { FastifyInstance } from 'fastify';
import { revokeSessionRequest, type RevokeSessionRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { validateBody } from '../../../shared/validation.js';
import { listSessionsHandler, revokeSessionHandler } from '../handlers/sessions.handler.js';

/** Session management routes for US-HRM-008 (security settings). */
export async function sessionsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/identity/sessions', { preHandler: [authenticate] }, listSessionsHandler);

  app.post<{ Body: RevokeSessionRequest }>(
    '/identity/sessions/revoke',
    { preHandler: [authenticate], preValidation: [validateBody(revokeSessionRequest)] },
    revokeSessionHandler,
  );
}
