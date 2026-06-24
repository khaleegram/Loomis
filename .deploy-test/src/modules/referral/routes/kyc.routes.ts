import type { FastifyInstance } from 'fastify';
import {
  rejectKycRequest,
  reviewKycRequest,
  submitKycRequest,
  type RejectKycRequest,
  type ReviewKycRequest,
  type SubmitKycRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  approveKycHandler,
  getMyKycHandler,
  listPendingKycHandler,
  rejectKycHandler,
  submitKycHandler,
} from '../handlers/index.js';

/** KYC routes (US-REF-001 / FR-REF-001..002). */
export async function kycRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: SubmitKycRequest }>(
    '/platform/referral/kyc',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(submitKycRequest)],
    },
    submitKycHandler,
  );

  app.get(
    '/platform/referral/kyc/me',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('regional_manager', 'regional_subordinate'),
      ],
    },
    getMyKycHandler,
  );

  app.get(
    '/platform/referral/kyc/pending',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
      ],
    },
    listPendingKycHandler,
  );

  app.post<{ Params: { kycId: string }; Body: ReviewKycRequest }>(
    '/platform/referral/kyc/:kycId/approve',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(reviewKycRequest)],
    },
    approveKycHandler,
  );

  app.post<{ Params: { kycId: string }; Body: RejectKycRequest }>(
    '/platform/referral/kyc/:kycId/reject',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_owner', 'platform_admin'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(rejectKycRequest)],
    },
    rejectKycHandler,
  );
}
