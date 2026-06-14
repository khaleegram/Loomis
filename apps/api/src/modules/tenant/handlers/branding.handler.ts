import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateSchoolBrandingRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { brandingService } from '../services/branding.service.js';

interface TenantParams {
  tenantId: string;
}

/** GET /tenants/:tenantId/branding — school identity for UI and documents. */
export async function getSchoolBrandingHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const branding = await brandingService.getBranding(req.params.tenantId);
  return sendSuccess(reply, branding);
}

/** PUT /tenants/:tenantId/branding — update school logo (storage object id). */
export async function updateSchoolBrandingHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: UpdateSchoolBrandingRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const branding = await brandingService.updateBranding(req.params.tenantId, req.body);
  return sendSuccess(reply, branding);
}
