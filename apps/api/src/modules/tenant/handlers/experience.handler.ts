import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateTenantExperienceRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { tenantExperienceService } from '../services/tenant-experience.service.js';
import { requireActor } from './_context.js';

interface TenantParams {
  tenantId: string;
}

export async function getTenantExperienceHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const experience = await tenantExperienceService.getExperience(req.params.tenantId);
  return sendSuccess(reply, experience);
}

export async function updateTenantExperienceHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: UpdateTenantExperienceRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const experience = await tenantExperienceService.updateExperience(
    req.params.tenantId,
    req.body,
    actor,
  );
  return sendSuccess(reply, experience);
}
