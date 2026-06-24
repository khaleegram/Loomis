import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuditLogExportRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { LoomisError } from '../../../shared/errors.js';
import { auditReadService } from '../services/audit-read.service.js';

function requireActor(req: FastifyRequest) {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  return user;
}

export async function searchAuditLogHandler(
  req: FastifyRequest<{ Querystring: Record<string, string | undefined> }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const q = req.query;
  const result = await auditReadService.search({
    actorUserId: q.actorUserId,
    tenantId: q.tenantId,
    action: q.action,
    sensitivity: q.sensitivity as import('@loomis/contracts').AuditSensitivity | undefined,
    from: q.from,
    to: q.to,
    cursor: q.cursor,
    limit: q.limit ? Number(q.limit) : undefined,
  });
  return sendSuccess(reply, result);
}

export async function exportAuditLogHandler(
  req: FastifyRequest<{ Body: AuditLogExportRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const result = await auditReadService.export(req.body, actor.sub, req.id);
  return sendSuccess(reply, result);
}
