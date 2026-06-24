import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  ApplyTenantPsfRateRequest,
  RequestPsfRateOverrideRequest,
  SetGlobalPsfRateRequest,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { psfRateService } from '../services/psf-rate.service.js';
import { psfSuggestionService } from '../services/psf-suggestion.service.js';
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

/** POST /platform/tenants/:tenantId/psf-rate/apply — apply suggested or explicit PSF rate. */
export async function applyTenantPsfRateHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: ApplyTenantPsfRateRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const { tenantId } = req.params;
  let rateMinor = req.body.rateMinor;

  if (req.body.useSuggested) {
    const suggested = await psfSuggestionService.getSuggestedRateMinor(tenantId);
    if (suggested == null) {
      throw new LoomisError(
        'TENANT_PSF_SUGGESTION_UNAVAILABLE',
        422,
        'No fee-based PSF suggestion yet — configure fee structures first',
      );
    }
    rateMinor = suggested;
  }

  if (rateMinor == null) {
    throw new LoomisError('VALIDATION_ERROR', 422, 'Provide rateMinor or set useSuggested to true');
  }

  const snapshot = await psfRateService.setTenantPsfRateDirect(
    {
      tenantId,
      rateMinor,
      reason:
        req.body.reason ??
        (req.body.useSuggested
          ? 'Applied fee-structure PSF suggestion (platform)'
          : 'Platform PSF rate update'),
    },
    actor,
  );

  return sendSuccess(
    reply,
    { rateMinor: snapshot.rateMinor, snapshotId: snapshot.id },
    201,
  );
}
