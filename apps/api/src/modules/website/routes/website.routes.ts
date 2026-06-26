import type { FastifyInstance } from 'fastify';
import {
  submitWebsiteInquiryRequest,
  updateWebsiteSiteRequest,
  updateWebsiteInquiryRequest,
  type SubmitWebsiteInquiryRequest,
  type UpdateWebsiteInquiryRequest,
  type UpdateWebsiteSiteRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireCapability } from '../../../middleware/require-capability.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import { websiteInquiryRateLimiter } from '../middleware/website-inquiry-rate-limiter.js';
import {
  checkWebsiteSlugHandler,
  getPublicWebsiteHandler,
  getWebsiteSiteHandler,
  listWebsiteInquiriesHandler,
  publishWebsiteHandler,
  submitPublicWebsiteInquiryHandler,
  unpublishWebsiteHandler,
  updateWebsiteInquiryHandler,
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

  app.get<{ Params: { tenantId: string }; Querystring: { slug?: string } }>(
    '/tenants/:tenantId/website/slug-check',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole(...WEBSITE_EDITORS)],
    },
    checkWebsiteSlugHandler,
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

  app.get<{ Params: { tenantId: string }; Querystring: { status?: string } }>(
    '/tenants/:tenantId/website/inquiries',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...WEBSITE_EDITORS),
        requireCapability('website.inquiries.view'),
      ],
    },
    listWebsiteInquiriesHandler,
  );

  app.patch<{
    Params: { tenantId: string; inquiryId: string };
    Body: UpdateWebsiteInquiryRequest;
  }>(
    '/tenants/:tenantId/website/inquiries/:inquiryId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...WEBSITE_EDITORS),
        requireCapability('website.inquiries.view'),
      ],
      preValidation: [validateBody(updateWebsiteInquiryRequest)],
    },
    updateWebsiteInquiryHandler,
  );
}

/** Unauthenticated public school websites. */
export async function publicWebsiteRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { slug: string } }>('/public/sites/:slug', getPublicWebsiteHandler);

  app.post<{ Params: { slug: string }; Body: SubmitWebsiteInquiryRequest }>(
    '/public/sites/:slug/inquiries',
    {
      preHandler: [websiteInquiryRateLimiter],
      preValidation: [validateBody(submitWebsiteInquiryRequest)],
    },
    submitPublicWebsiteInquiryHandler,
  );
}
