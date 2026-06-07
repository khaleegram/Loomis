import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreatePrivilegedChangeRequest,
  DecidePrivilegedChangeRequest,
  RequestIvpRecountRequest,
  StartBreakGlassRequest,
  UpdateIvpCaseRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import {
  breakGlassService,
  ivpCaseService,
  privilegedChangeService,
} from '../services/index.js';
import { requireActor } from './_context.js';
import {
  breakGlassToResponse,
  ivpCaseToResponse,
  privilegedChangeToResponse,
} from './_serializers.js';

export async function listPlatformIvpCasesHandler(
  req: FastifyRequest<{ Querystring: { status?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await ivpCaseService.listPlatformCases(requireActor(req), req.query.status);
  return sendSuccess(reply, rows.map(ivpCaseToResponse));
}

export async function listTenantIvpCasesHandler(
  req: FastifyRequest<{ Params: { tenantId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await ivpCaseService.listTenantCases(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, rows.map(ivpCaseToResponse));
}

export async function getIvpCaseHandler(
  req: FastifyRequest<{ Params: { tenantId?: string; caseId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const tenantScope = req.params.tenantId ?? actor.tenantId;
  const row = await ivpCaseService.getCase(tenantScope, req.params.caseId, actor);
  return sendSuccess(reply, ivpCaseToResponse(row));
}

export async function updateIvpCaseHandler(
  req: FastifyRequest<{ Params: { caseId: string }; Body: UpdateIvpCaseRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await ivpCaseService.updateCase(null, req.params.caseId, req.body, requireActor(req));
  return sendSuccess(reply, ivpCaseToResponse(row));
}

export async function requestIvpRecountHandler(
  req: FastifyRequest<{ Params: { caseId: string }; Body: RequestIvpRecountRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await ivpCaseService.requestRecount(
    '',
    req.params.caseId,
    req.body,
    requireActor(req),
  );
  return sendSuccess(reply, ivpCaseToResponse(row));
}

export async function listPrivilegedChangesHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await privilegedChangeService.list(requireActor(_req));
  return sendSuccess(reply, rows.map(privilegedChangeToResponse));
}

export async function createPrivilegedChangeHandler(
  req: FastifyRequest<{ Body: CreatePrivilegedChangeRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await privilegedChangeService.create(req.body, requireActor(req));
  return sendSuccess(reply, privilegedChangeToResponse(row), 201);
}

export async function decidePrivilegedChangeHandler(
  req: FastifyRequest<{ Params: { changeId: string }; Body: DecidePrivilegedChangeRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await privilegedChangeService.decide(req.params.changeId, req.body, requireActor(req));
  return sendSuccess(reply, privilegedChangeToResponse(row));
}

export async function executePrivilegedChangeHandler(
  req: FastifyRequest<{ Params: { changeId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await privilegedChangeService.execute(req.params.changeId, requireActor(req));
  return sendSuccess(reply, privilegedChangeToResponse(row));
}

export async function startBreakGlassHandler(
  req: FastifyRequest<{ Body: StartBreakGlassRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breakGlassService.startSession(req.body, requireActor(req), req.id);
  return sendSuccess(reply, breakGlassToResponse(row), 201);
}

export async function getActiveBreakGlassHandler(
  req: FastifyRequest<{ Params: { tenantId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breakGlassService.getActiveForTenant(req.params.tenantId, requireActor(req));
  return sendSuccess(reply, row ? breakGlassToResponse(row) : null);
}

export async function revokeBreakGlassHandler(
  req: FastifyRequest<{ Params: { tenantId: string; sessionId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breakGlassService.revokeSession(
    req.params.tenantId,
    req.params.sessionId,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, breakGlassToResponse(row));
}
