import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateTierRequest,
  MigrateProductTierRequest,
  UpdateTenantContactsRequest,
  UpdateTierRequest,
  UpsertProvisionDraftRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { provisionDraftService } from '../services/provision-draft.service.js';
import { tenantPsfStatusService } from '../services/tenant-psf-status.service.js';
import { tierAdminService } from '../services/tier-admin.service.js';
import { tenantService } from '../services/tenant.service.js';
import { requireActor } from './_context.js';

interface TenantParams {
  tenantId: string;
}

interface TierParams {
  tierId: string;
}

export async function activateTenantHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenant = await tenantService.activateTenantEarly(req.params.tenantId, actor);
  return sendSuccess(reply, {
    status: 'active' as const,
    activatedAt: tenant.activatedAt!.toISOString(),
  });
}

export async function updateTenantContactsHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: UpdateTenantContactsRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenant = await tenantService.updateTenantContacts(
    req.params.tenantId,
    req.body,
    actor,
  );
  return sendSuccess(reply, await tenantService.toResponse(tenant, { includeOnboarding: true }));
}

export async function migrateProductTierHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: MigrateProductTierRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenant = await tenantService.migrateProductTier(
    req.params.tenantId,
    req.body,
    actor,
  );
  return sendSuccess(reply, await tenantService.toResponse(tenant, { includeOnboarding: true }));
}

export async function createTierHandler(
  req: FastifyRequest<{ Body: CreateTierRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const tier = await tierAdminService.createTier(req.body);
  return sendSuccess(reply, tier, 201);
}

export async function updateTierHandler(
  req: FastifyRequest<{ Params: TierParams; Body: UpdateTierRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const tier = await tierAdminService.updateTier(req.params.tierId, req.body);
  return sendSuccess(reply, tier);
}

export async function getPlatformProvisionDraftHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const draft = await provisionDraftService.getDraft(actor.userId, 'platform');
  return sendSuccess(reply, draft);
}

export async function upsertPlatformProvisionDraftHandler(
  req: FastifyRequest<{ Body: UpsertProvisionDraftRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const draft = await provisionDraftService.upsertDraft(actor.userId, 'platform', req.body);
  return sendSuccess(reply, draft);
}

export async function deletePlatformProvisionDraftHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  await provisionDraftService.clearDraft(actor.userId, 'platform');
  return sendSuccess(reply, { status: 'cleared' as const });
}

export async function getRegionalProvisionDraftHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const draft = await provisionDraftService.getDraft(actor.userId, 'regional');
  return sendSuccess(reply, draft);
}

export async function upsertRegionalProvisionDraftHandler(
  req: FastifyRequest<{ Body: UpsertProvisionDraftRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const draft = await provisionDraftService.upsertDraft(actor.userId, 'regional', req.body);
  return sendSuccess(reply, draft);
}

export async function deleteRegionalProvisionDraftHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  await provisionDraftService.clearDraft(actor.userId, 'regional');
  return sendSuccess(reply, { status: 'cleared' as const });
}

export async function getTenantPsfStatusHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const status = await tenantPsfStatusService.getStatus(req.params.tenantId);
  return sendSuccess(reply, status);
}
