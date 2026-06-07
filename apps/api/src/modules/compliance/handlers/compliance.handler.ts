import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AcknowledgeBreachRequest,
  CreateBreachRecordRequest,
  CreateConsentVersionRequest,
  CreateDsarRequest,
  RecordNdpcNotificationRequest,
  RespondDsarRequest,
  UpdateBreachRecordRequest,
  UpdateDsarRequest,
  UpdateRetentionScheduleRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import {
  breachService,
  consentService,
  dashboardService,
  dsarService,
  retentionService,
} from '../services/index.js';
import { requireActor } from './_context.js';
import {
  breachToResponse,
  consentToResponse,
  dashboardToResponse,
  dsarToResponse,
  ndpcDraftToResponse,
  retentionScheduleToResponse,
} from './_serializers.js';

export async function getComplianceDashboardHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const data = await dashboardService.getPosture(requireActor(req));
  return sendSuccess(reply, dashboardToResponse(data));
}

export async function listDsarsHandler(
  req: FastifyRequest<{ Querystring: { status?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await dsarService.list(requireActor(req), req.query.status);
  return sendSuccess(reply, rows.map(dsarToResponse));
}

export async function getDsarHandler(
  req: FastifyRequest<{ Params: { dsarId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await dsarService.get(req.params.dsarId, requireActor(req));
  return sendSuccess(reply, dsarToResponse(row));
}

export async function createDsarHandler(
  req: FastifyRequest<{ Body: CreateDsarRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await dsarService.create(req.body, requireActor(req), req.id);
  return sendSuccess(reply, dsarToResponse(row), 201);
}

export async function updateDsarHandler(
  req: FastifyRequest<{ Params: { dsarId: string }; Body: UpdateDsarRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await dsarService.update(req.params.dsarId, req.body, requireActor(req), req.id);
  return sendSuccess(reply, dsarToResponse(row));
}

export async function collectDsarDataHandler(
  req: FastifyRequest<{ Params: { dsarId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await dsarService.collectData(req.params.dsarId, requireActor(req), req.id);
  return sendSuccess(reply, dsarToResponse(row));
}

export async function respondDsarHandler(
  req: FastifyRequest<{ Params: { dsarId: string }; Body: RespondDsarRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await dsarService.respond(req.params.dsarId, req.body, requireActor(req), req.id);
  return sendSuccess(reply, dsarToResponse(row));
}

export async function listBreachesHandler(
  req: FastifyRequest<{ Querystring: { status?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await breachService.list(requireActor(req), req.query.status);
  return sendSuccess(reply, rows.map(breachToResponse));
}

export async function getBreachHandler(
  req: FastifyRequest<{ Params: { breachId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breachService.get(req.params.breachId, requireActor(req));
  return sendSuccess(reply, breachToResponse(row));
}

export async function createBreachHandler(
  req: FastifyRequest<{ Body: CreateBreachRecordRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breachService.create(req.body, requireActor(req), req.id);
  return sendSuccess(reply, breachToResponse(row), 201);
}

export async function updateBreachHandler(
  req: FastifyRequest<{ Params: { breachId: string }; Body: UpdateBreachRecordRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breachService.update(
    req.params.breachId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, breachToResponse(row));
}

export async function acknowledgeBreachHandler(
  req: FastifyRequest<{ Params: { breachId: string }; Body: AcknowledgeBreachRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breachService.acknowledge(
    req.params.breachId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, breachToResponse(row));
}

export async function getNdpcDraftHandler(
  req: FastifyRequest<{ Params: { breachId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const draft = await breachService.getNdpcDraft(req.params.breachId, requireActor(req));
  return sendSuccess(reply, ndpcDraftToResponse(draft));
}

export async function recordNdpcNotificationHandler(
  req: FastifyRequest<{ Params: { breachId: string }; Body: RecordNdpcNotificationRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await breachService.recordNdpcNotification(
    req.params.breachId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, breachToResponse(row));
}

export async function listConsentVersionsHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await consentService.list(requireActor(req));
  return sendSuccess(reply, rows.map(consentToResponse));
}

export async function getActiveConsentVersionHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await consentService.getActive(requireActor(req));
  return sendSuccess(reply, row ? consentToResponse(row) : null);
}

export async function publishConsentVersionHandler(
  req: FastifyRequest<{ Body: CreateConsentVersionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await consentService.publish(req.body, requireActor(req), req.id);
  return sendSuccess(reply, consentToResponse(row), 201);
}

export async function listRetentionSchedulesHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rows = await retentionService.listSchedules(requireActor(req));
  return sendSuccess(reply, rows.map(retentionScheduleToResponse));
}

export async function updateRetentionScheduleHandler(
  req: FastifyRequest<{ Params: { scheduleId: string }; Body: UpdateRetentionScheduleRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const row = await retentionService.updateSchedule(
    req.params.scheduleId,
    req.body,
    requireActor(req),
    req.id,
  );
  return sendSuccess(reply, retentionScheduleToResponse(row));
}
