import type { FastifyReply, FastifyRequest } from 'fastify';
import type { StepUpSendSmsRequest } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';

/** POST /auth/stepup/sms/send — dispatches SMS OTP for Core step-up actions. */
export async function stepUpSendSmsHandler(
  req: FastifyRequest<{ Body: StepUpSendSmsRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  const result = await authService.sendStepUpSms(user.sub, req.body.action, {
    ...(req.body.refundAmountMinor !== undefined
      ? { refundAmountMinor: req.body.refundAmountMinor }
      : {}),
  });

  return sendSuccess(reply, result);
}
