import type { FastifyInstance } from 'fastify';
import {
  createPsfAdjustmentRequest,
  snapshotNowRequest,
  type CreatePsfAdjustmentRequest,
  type SnapshotNowRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireCapability } from '../../../middleware/require-capability.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  censusLockDeprecatedHandler,
  createBillingAdjustmentHandler,
  listBillingAdjustmentsHandler,
  platformBillingPreviewHandler,
  snapshotNowHandler,
} from '../handlers/index.js';

/** Platform billing routes (US-ASM-003; System Design §8.1). */
export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/billing/preview',
    {
      preHandler: [authenticate, requireTenantMatch, requireCapability('census.lock')],
    },
    platformBillingPreviewHandler,
  );

  app.post<{ Params: { tenantId: string; termId: string }; Body: SnapshotNowRequest }>(
    '/tenants/:tenantId/terms/:termId/billing/snapshot-now',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner'),
        requireCapability('census.lock'),
      ],
      preValidation: [validateBody(snapshotNowRequest)],
    },
    snapshotNowHandler,
  );

  app.post<{ Params: { tenantId: string; termId: string }; Body: CreatePsfAdjustmentRequest }>(
    '/tenants/:tenantId/terms/:termId/billing/adjustments',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner'),
        requireCapability('census.lock'),
      ],
      preValidation: [validateBody(createPsfAdjustmentRequest)],
    },
    createBillingAdjustmentHandler,
  );

  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/billing/adjustments',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('school_owner'),
        requireCapability('census.lock'),
      ],
    },
    listBillingAdjustmentsHandler,
  );

  // Legacy census routes — redirect clients to billing endpoints.
  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/census/preview',
    {
      preHandler: [authenticate, requireTenantMatch, requireCapability('census.lock')],
    },
    platformBillingPreviewHandler,
  );

  app.post<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/census/lock',
    {
      preHandler: [authenticate, requireTenantMatch, requireCapability('census.lock')],
    },
    censusLockDeprecatedHandler,
  );
}
