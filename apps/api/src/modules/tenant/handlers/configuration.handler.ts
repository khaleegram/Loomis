import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UpsertConfigurationRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { configurationService } from '../services/configuration.service.js';

interface TenantParams {
  tenantId: string;
}

/** GET /tenants/:tenantId/configurations — list tenant configuration entries. */
export async function listConfigurationsHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const configurations = await configurationService.listConfigurations(req.params.tenantId);
  return sendSuccess(reply, { configurations });
}

/** PUT /tenants/:tenantId/configurations — upsert a configuration entry. */
export async function upsertConfigurationHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: UpsertConfigurationRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const config = await configurationService.upsertConfiguration(req.params.tenantId, req.body);
  return sendSuccess(reply, config);
}
