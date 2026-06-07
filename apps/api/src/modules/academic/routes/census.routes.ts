import type { FastifyInstance } from 'fastify';
import { censusLockRequest, type CensusLockRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import { censusLockHandler, censusPreviewHandler } from '../handlers/index.js';

/**
 * Census lock route (FR-SIS-006 / FR-ASM-005 / US-ASM-003; System Design §8.1).
 *
 * This is the PSF revenue trigger and a financial write, so it carries the full
 * middleware stack in the loomis-api order: authenticate → requireTenantMatch →
 * requireRole → requireStepUp('census_lock') → requireIdempotencyKey. Only the
 * School Owner or Principal may attest.
 */
const censusReaders = ['school_owner', 'principal'] as const;

export async function censusRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/census/preview',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole(...censusReaders),
      ],
    },
    censusPreviewHandler,
  );

  app.post<{ Params: { tenantId: string; termId: string }; Body: CensusLockRequest }>(
    '/tenants/:tenantId/terms/:termId/census/lock',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner', 'principal'),
        requireStepUp('census_lock'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(censusLockRequest)],
    },
    censusLockHandler,
  );
}
