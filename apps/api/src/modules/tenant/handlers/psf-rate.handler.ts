import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  RequestPsfRateOverrideRequest,
  SetGlobalPsfRateRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { psfRateService } from '../services/psf-rate.service.js';
import { psfRateSnapshotToResponse } from './_serializers.js';
import { requireActor } from './_context.js';

interface TenantParams {
  tenantId: string;
}

/** POST /tenants/psf-rate/global — set the platform-wide default PSF rate (US-PLT-003). */
export async function setGlobalPsfRateHandler(
  req: FastifyRequest<{ Body: SetGlobalPsfRateRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const snapshot = await psfRateService.setGlobalPsfRate(
    { ...req.body, effectiveFrom: new Date(req.body.effectiveFrom) },
    actor,
  );
  return sendSuccess(reply, psfRateSnapshotToResponse(snapshot), 201);
}

/** GET /tenants/psf-rate/global/history — global default rate history. */
export async function getGlobalPsfHistoryHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const snapshots = await psfRateService.getGlobalHistory();
  return sendSuccess(reply, { snapshots: snapshots.map(psfRateSnapshotToResponse) });
}

/**
 * POST /tenants/:tenantId/psf-rate/override — request a per-school override
 * (US-PLT-004 / FR-PLT-002). Routes through the dual-approval workflow.
 */
export async function requestPsfRateOverrideHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: RequestPsfRateOverrideRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const result = await psfRateService.requestPsfRateOverride(
    {
      tenantId: req.params.tenantId,
      rateMinor: req.body.rateMinor,
      effectiveFrom: new Date(req.body.effectiveFrom),
      justification: req.body.justification,
    },
    actor,
  );
  return sendSuccess(reply, result, 202);
}

/** GET /tenants/:tenantId/psf-rate/history — per-tenant override history. */
export async function getTenantPsfHistoryHandler(
  req: FastifyRequest<{ Params: TenantParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const snapshots = await psfRateService.getTenantHistory(req.params.tenantId);
  return sendSuccess(reply, { snapshots: snapshots.map(psfRateSnapshotToResponse) });
}
