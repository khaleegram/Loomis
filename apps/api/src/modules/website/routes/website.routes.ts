import type { FastifyInstance } from 'fastify';
import { updateWebsiteSiteRequest, type UpdateWebsiteSiteRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  getPublicWebsiteHandler,
  getWebsiteSiteHandler,
  publishWebsiteHandler,
  unpublishWebsiteHandler,
  updateWebsiteSiteHandler,
} from '../handlers/website.handler.js';

const WEBSITE_VIEWERS = [
  'school_owner',
  'principal',
  'admin_officer',
  'platform_owner',
  'platform_admin',
] as const;

const WEBSITE_EDITORS = ['school_owner', 'principal', 'admin_officer'] as const;

const WEBSITE_PUBLISHERS = ['school_owner', 'principal'] as const;

export async function websiteRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/website',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...WEBSITE_VIEWERS)],
    },
    getWebsiteSiteHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpdateWebsiteSiteRequest }>(
    '/tenants/:tenantId/website',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...WEBSITE_EDITORS)],
      preValidation: [validateBody(updateWebsiteSiteRequest)],
    },
    updateWebsiteSiteHandler,
  );

  app.post<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/website/publish',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...WEBSITE_PUBLISHERS),
        requireIdempotencyKey,
      ],
    },
    publishWebsiteHandler,
  );

  app.post<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/website/unpublish',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...WEBSITE_PUBLISHERS),
        requireIdempotencyKey,
      ],
    },
    unpublishWebsiteHandler,
  );
}

/** Unauthenticated public school websites. */
export async function publicWebsiteRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { slug: string } }>('/public/sites/:slug', getPublicWebsiteHandler);
}
