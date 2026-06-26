import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  ConvertWebsiteInquiryToAdmissionRequest,
  SubmitWebsiteInquiryRequest,
  SubmitWebsitePageViewRequest,
  UpdateWebsiteInquiryRequest,
  UpdateWebsiteSiteRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { requireWebsiteActor } from './_context.js';
import { websiteAnalyticsService } from '../services/analytics.service.js';
import { websiteInquiryService } from '../services/inquiry.service.js';
import { websiteService } from '../services/website.service.js';

interface TenantParams {
  tenantId: string;
}

interface SlugParams {
  slug: string;
}

export async function getWebsiteSiteHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const site = await websiteService.getSite(req.params.tenantId);
  return sendSuccess(reply, site);
}

export async function checkWebsiteSlugHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: { slug?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await websiteService.checkSlug(
    req.params.tenantId,
    req.query.slug ?? '',
  );
  return sendSuccess(reply, result);
}

export async function updateWebsiteSiteHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: UpdateWebsiteSiteRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireWebsiteActor(req);
  const site = await websiteService.updateSite(
    req.params.tenantId,
    req.body,
    actor.userId,
  );
  return sendSuccess(reply, site);
}

export async function publishWebsiteHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireWebsiteActor(req);
  const result = await websiteService.publishSite(req.params.tenantId, actor.userId);
  return sendSuccess(reply, {
    site: result.site,
    version: result.version,
    publishedAt: result.site.publishedAt!,
  });
}

export async function unpublishWebsiteHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireWebsiteActor(req);
  const site = await websiteService.unpublishSite(req.params.tenantId, actor.userId);
  return sendSuccess(reply, site);
}

export async function getPublicWebsiteHandler(
  req: FastifyRequest<{ Params: SlugParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const site = await websiteService.getPublicSite(req.params.slug);
  reply.header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return sendSuccess(reply, site);
}

export async function submitPublicWebsiteInquiryHandler(
  req: FastifyRequest<{ Params: SlugParams; Body: SubmitWebsiteInquiryRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await websiteInquiryService.submitPublicInquiry(
    req.params.slug,
    req.body,
    req.ip,
  );
  return sendSuccess(reply, result, 201);
}

export async function submitPublicWebsitePageViewHandler(
  req: FastifyRequest<{ Params: SlugParams; Body: SubmitWebsitePageViewRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userAgentHeader = req.headers['user-agent'];
  await websiteAnalyticsService.recordPageView(req.params.slug, req.body, {
    ip: req.ip,
    userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
  });
  return sendSuccess(reply, { ok: true }, 202);
}

export async function listWebsiteInquiriesHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: { status?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await websiteInquiryService.listInquiries(
    req.params.tenantId,
    req.query.status,
  );
  return sendSuccess(reply, result);
}

export async function updateWebsiteInquiryHandler(
  req: FastifyRequest<{
    Params: TenantParams & { inquiryId: string };
    Body: UpdateWebsiteInquiryRequest;
  }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await websiteInquiryService.updateInquiryStatus(
    req.params.tenantId,
    req.params.inquiryId,
    req.body,
  );
  return sendSuccess(reply, result);
}

export async function convertWebsiteInquiryToAdmissionHandler(
  req: FastifyRequest<{
    Params: TenantParams & { inquiryId: string };
    Body: ConvertWebsiteInquiryToAdmissionRequest;
  }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireWebsiteActor(req);
  const result = await websiteInquiryService.convertToAdmission(
    req.params.tenantId,
    req.params.inquiryId,
    req.body,
    actor,
  );
  return sendSuccess(reply, result, 201);
}

export async function getWebsiteAnalyticsHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: { days?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const days = req.query.days ? Number(req.query.days) : undefined;
  const result = await websiteAnalyticsService.getAnalytics(req.params.tenantId, days);
  return sendSuccess(reply, result);
}
