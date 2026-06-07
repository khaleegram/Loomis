import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateSubordinateRequest,
  RejectKycRequest,
  ReviewKycRequest,
  SubmitKycRequest,
  ValidateReferralCodeRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import {
  attributionService,
  codeService,
  earningService,
  kycService,
  participantService,
  payoutService,
} from '../services/index.js';
import { requireActor } from './_context.js';
import {
  attributionToResponse,
  capCheckToResponse,
  codeRevealToResponse,
  codeSummaryToResponse,
  earningToResponse,
  earningsSummaryToResponse,
  kycToResponse,
  participantToResponse,
  payoutCycleToResponse,
} from './_serializers.js';

export async function getMyParticipantHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await participantService.getMe(requireActor(req));
  return sendSuccess(reply, participantToResponse(row));
}

export async function ensureMyParticipantHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await participantService.getOrCreateForUser(requireActor(req));
  return sendSuccess(reply, participantToResponse(row));
}

export async function createSubordinateHandler(
  req: FastifyRequest<{ Body: CreateSubordinateRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await participantService.createSubordinate(req.body, requireActor(req));
  return sendSuccess(reply, participantToResponse(row), 201);
}

export async function listSubordinatesHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await participantService.listSubordinates(requireActor(req));
  return sendSuccess(reply, rows.map(participantToResponse));
}

export async function submitKycHandler(
  req: FastifyRequest<{ Body: SubmitKycRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await kycService.submit(req.body, requireActor(req), req.id);
  return sendSuccess(reply, kycToResponse(row), 201);
}

export async function getMyKycHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await kycService.getMyLatest(requireActor(req));
  return sendSuccess(reply, row ? kycToResponse(row) : null);
}

export async function listPendingKycHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await kycService.listPending(requireActor(req));
  return sendSuccess(reply, rows.map(kycToResponse));
}

export async function approveKycHandler(
  req: FastifyRequest<{ Params: { kycId: string }; Body: ReviewKycRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await kycService.approve(req.params.kycId, req.body, requireActor(req), req.id);
  return sendSuccess(reply, {
    kyc: kycToResponse(result.kyc),
    code: codeRevealToResponse(result.codeReveal),
  });
}

export async function rejectKycHandler(
  req: FastifyRequest<{ Params: { kycId: string }; Body: RejectKycRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await kycService.reject(req.params.kycId, req.body, requireActor(req), req.id);
  return sendSuccess(reply, kycToResponse(row));
}

export async function regenerateCodeHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await codeService.regenerate(requireActor(req), req.id);
  return sendSuccess(reply, codeRevealToResponse(row));
}

export async function getMyCodeHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await codeService.getMyCodeSummary(requireActor(req));
  return sendSuccess(reply, codeSummaryToResponse(row));
}

export async function validateReferralCodeHandler(
  req: FastifyRequest<{ Body: ValidateReferralCodeRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await attributionService.validateReferralCode(req.body.rawCode);
  return sendSuccess(reply, result);
}

export async function listAttributionsHandler(
  req: FastifyRequest<{ Querystring: { status?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await attributionService.listAttributionMap(requireActor(req), req.query.status);
  return sendSuccess(reply, rows.map(attributionToResponse));
}

export async function getTenantAttributionHandler(
  req: FastifyRequest<{ Params: { tenantId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await attributionService.getAttributionForTenant(
    req.params.tenantId,
    requireActor(req),
  );
  return sendSuccess(reply, attributionToResponse(row));
}

export async function getMyEarningsHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const participant = await participantService.getMe(requireActor(req));
  const rows = await earningService.getMyEarnings(participant.id);
  return sendSuccess(reply, rows.map(earningToResponse));
}

export async function getMyEarningsSummaryHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const participant = await participantService.getMe(requireActor(req));
  const summary = await earningService.getEarningsSummary(participant.id);
  return sendSuccess(reply, earningsSummaryToResponse(summary));
}

export async function listPayoutCyclesHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await payoutService.listCycles(requireActor(req));
  return sendSuccess(reply, rows.map(payoutCycleToResponse));
}

export async function getPayoutCycleHandler(
  req: FastifyRequest<{ Params: { cycleId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await payoutService.getCycle(req.params.cycleId, requireActor(req));
  return sendSuccess(reply, payoutCycleToResponse(row));
}

export async function closePayoutCycleHandler(
  req: FastifyRequest<{ Params: { cycleId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await payoutService.closeCycle(req.params.cycleId, requireActor(req), req.id);
  return sendSuccess(reply, payoutCycleToResponse(row));
}

export async function checkTenantCapHandler(
  req: FastifyRequest<{ Params: { cycleId: string; tenantId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await payoutService.checkTenantCap(
    req.params.tenantId,
    req.params.cycleId,
    requireActor(req),
  );
  return sendSuccess(reply, capCheckToResponse(row));
}
