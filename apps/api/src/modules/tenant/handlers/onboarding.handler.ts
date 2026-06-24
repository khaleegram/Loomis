import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../../shared/http.js';
import { tenantOnboardingService } from '../services/tenant-onboarding.service.js';

interface TenantParams {
  tenantId: string;
}

/** GET /tenants/:tenantId/onboarding — school + platform onboarding checklist. */
export async function getTenantOnboardingHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const status = await tenantOnboardingService.getStatus(req.params.tenantId);
  return sendSuccess(reply, status);
}
