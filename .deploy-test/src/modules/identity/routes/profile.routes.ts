import type { FastifyInstance } from 'fastify';
import { updateProfileRequest, type UpdateProfileRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { validateBody } from '../../../shared/validation.js';
import { getProfileHandler, updateProfileHandler } from '../handlers/profile.handler.js';

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/identity/me/profile', { preHandler: [authenticate] }, getProfileHandler);

  app.patch<{ Body: UpdateProfileRequest }>(
    '/identity/me/profile',
    { preHandler: [authenticate], preValidation: [validateBody(updateProfileRequest)] },
    updateProfileHandler,
  );
}
