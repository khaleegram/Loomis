import type { FastifyInstance } from 'fastify';
import {
  changePasswordRequest,
  type ChangePasswordRequest,
  loginRequest,
  type LoginRequest,
  type LogoutRequest,
  mfaEnrollConfirmRequest,
  type MfaEnrollConfirmRequest,
  mfaVerifyRequest,
  type MfaVerifyRequest,
  mfaVoluntaryEnrollConfirmRequest,
  type MfaVoluntaryEnrollConfirmRequest,
  type RefreshTokenRequest,
  stepUpRequest,
  type StepUpRequest,
  stepUpSendSmsRequest,
  type StepUpSendSmsRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { loginRateLimiter } from '../../../middleware/login-rate-limiter.js';
import { validateBody } from '../../../shared/validation.js';
import {
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  mfaEnrollConfirmHandler,
  mfaEnrollStartHandler,
  mfaStatusHandler,
  mfaVerifyHandler,
  mfaVoluntaryEnrollConfirmHandler,
  mfaVoluntaryEnrollStartHandler,
  refreshHandler,
  stepUpHandler,
  stepUpSendSmsHandler,
} from '../handlers/index.js';

/**
 * Identity auth routes (loomis-api conventions). Registered under /api/v1.
 * Public flows authenticate via their own proofs (password, MFA challenge,
 * enrollment/refresh tokens); logout and step-up require a valid access token.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginRequest }>(
    '/auth/login',
    { preValidation: [validateBody(loginRequest)], preHandler: [loginRateLimiter] },
    loginHandler,
  );

  app.post<{ Body: MfaVerifyRequest }>(
    '/auth/mfa/verify',
    { preValidation: [validateBody(mfaVerifyRequest)] },
    mfaVerifyHandler,
  );

  // Enrollment is authorised by the Bearer enrollment token, verified in the handler.
  app.get('/auth/mfa/enroll', mfaEnrollStartHandler);
  app.post<{ Body: MfaEnrollConfirmRequest }>(
    '/auth/mfa/enroll',
    { preValidation: [validateBody(mfaEnrollConfirmRequest)] },
    mfaEnrollConfirmHandler,
  );

  // Refresh accepts the token from the httpOnly cookie or the request body.
  app.post<{ Body: RefreshTokenRequest }>('/auth/refresh', refreshHandler);

  app.post<{ Body: LogoutRequest }>('/auth/logout', { preHandler: [authenticate] }, logoutHandler);

  app.post<{ Body: StepUpRequest }>(
    '/auth/stepup',
    { preHandler: [authenticate], preValidation: [validateBody(stepUpRequest)] },
    stepUpHandler,
  );

  app.post<{ Body: StepUpSendSmsRequest }>(
    '/auth/stepup/sms/send',
    { preHandler: [authenticate], preValidation: [validateBody(stepUpSendSmsRequest)] },
    stepUpSendSmsHandler,
  );

  app.post<{ Body: ChangePasswordRequest }>(
    '/auth/change-password',
    { preHandler: [authenticate], preValidation: [validateBody(changePasswordRequest)] },
    changePasswordHandler,
  );

  app.get('/auth/mfa/status', { preHandler: [authenticate] }, mfaStatusHandler);

  app.post('/auth/mfa/voluntary/enroll', { preHandler: [authenticate] }, mfaVoluntaryEnrollStartHandler);

  app.post<{ Body: MfaVoluntaryEnrollConfirmRequest }>(
    '/auth/mfa/voluntary/enroll/confirm',
    {
      preHandler: [authenticate],
      preValidation: [validateBody(mfaVoluntaryEnrollConfirmRequest)],
    },
    mfaVoluntaryEnrollConfirmHandler,
  );
}
