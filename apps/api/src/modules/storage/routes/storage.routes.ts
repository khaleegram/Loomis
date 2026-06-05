import type { FastifyInstance } from 'fastify';
import { createUploadUrlRequest, type CreateUploadUrlRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import { createUploadUrlHandler, getDownloadUrlHandler } from '../handlers/index.js';

/**
 * Storage routes (SRS §10.5; System Design §10).
 * Pre-signed URLs only — files never stream through the API.
 */
export async function storageRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateUploadUrlRequest }>(
    '/storage/upload-url',
    {
      preHandler: [authenticate, requireTenantMatch],
      preValidation: [validateBody(createUploadUrlRequest)],
    },
    createUploadUrlHandler,
  );

  app.get<{ Params: { id: string } }>(
    '/storage/objects/:id/url',
    {
      preHandler: [authenticate, requireTenantMatch],
    },
    getDownloadUrlHandler,
  );
}
