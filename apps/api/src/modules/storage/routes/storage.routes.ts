import type { FastifyInstance } from 'fastify';
import { createUploadUrlRequest, type CreateUploadUrlRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  createUploadUrlHandler,
  getDownloadUrlHandler,
  uploadObjectContentHandler,
} from '../handlers/index.js';

const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Storage routes (SRS §10.5; System Design §10).
 * Pre-signed URLs for mobile; web uploads via PUT /objects/:id/content to avoid S3 CORS.
 */
export async function storageRoutes(app: FastifyInstance): Promise<void> {
  for (const contentType of IMAGE_CONTENT_TYPES) {
    app.addContentTypeParser(
      contentType,
      { parseAs: 'buffer', bodyLimit: 25 * 1024 * 1024 },
      (_req, body, done) => {
        done(null, body);
      },
    );
  }

  app.post<{ Body: CreateUploadUrlRequest }>(
    '/storage/upload-url',
    {
      preHandler: [authenticate, requireTenantMatch],
      preValidation: [validateBody(createUploadUrlRequest)],
    },
    createUploadUrlHandler,
  );

  app.put<{ Params: { id: string }; Body: Buffer }>(
    '/storage/objects/:id/content',
    {
      preHandler: [authenticate, requireTenantMatch],
    },
    uploadObjectContentHandler,
  );

  app.get<{ Params: { id: string } }>(
    '/storage/objects/:id/url',
    {
      preHandler: [authenticate, requireTenantMatch],
    },
    getDownloadUrlHandler,
  );
}
