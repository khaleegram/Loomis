import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateWebsiteSiteRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { requireWebsiteActor } from './_context.js';
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
