import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ChangePasswordRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';

export async function changePasswordHandler(
  req: FastifyRequest<{ Body: ChangePasswordRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.authUser!.sub, newPassword, currentPassword);
  return sendSuccess(reply, { mustChangePassword: false as const });
}
