import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PasswordResetConfirmRequest, PasswordResetRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';

export async function passwordResetRequestHandler(
  req: FastifyRequest<{ Body: PasswordResetRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await authService.requestPasswordReset(req.body.email);
  return sendSuccess(reply, result);
}

export async function passwordResetConfirmHandler(
  req: FastifyRequest<{ Body: PasswordResetConfirmRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  await authService.confirmPasswordReset(req.body);
  return sendSuccess(reply, { ok: true as const });
}
