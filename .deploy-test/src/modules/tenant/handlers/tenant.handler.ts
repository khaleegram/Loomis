import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProvisionTenantRequest, SuspendTenantRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { tenantService } from '../services/tenant.service.js';
import { requireActor } from './_context.js';

interface TenantParams {
  tenantId: string;
}

/** GET /platform/tenants — list all school tenants (platform console). */
export async function listTenantsHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await tenantService.listTenants();
  return sendSuccess(reply, result);
}

/** GET /platform/tiers — list platform pricing tiers (provisioning form). */
export async function listTiersHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const tiers = await tenantService.listTiers();
  return sendSuccess(reply, { tiers });
}

/** POST /tenants — provision a new school tenant (US-PLT-001). */
export async function provisionTenantHandler(
  req: FastifyRequest<{ Body: ProvisionTenantRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenant = await tenantService.provisionTenant(req.body, actor);
  return sendSuccess(reply, await tenantService.toResponse(tenant), 201);
}

/** GET /tenants/:tenantId — read a tenant (platform console). */
export async function getTenantHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const tenant = await tenantService.getTenant(req.params.tenantId);
  return sendSuccess(reply, await tenantService.toResponse(tenant));
}

/** POST /tenants/:tenantId/suspend — suspend a tenant (US-PLT-002). */
export async function suspendTenantHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: SuspendTenantRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenant = await tenantService.suspendTenant(req.params.tenantId, req.body, actor);
  return sendSuccess(reply, await tenantService.toResponse(tenant));
}

/** POST /tenants/:tenantId/reinstate — reinstate a suspended tenant (US-PLT-002). */
export async function reinstateTenantHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenant = await tenantService.reinstateTenant(req.params.tenantId, actor);
  return sendSuccess(reply, await tenantService.toResponse(tenant));
}
