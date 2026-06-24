import type { FastifyInstance } from 'fastify';
import {
  amendFeeStructureRequest,
  createFeeStructureRequest,
  updateFeeStructureRequest,
  type AmendFeeStructureRequest,
  type CreateFeeStructureRequest,
  type UpdateFeeStructureRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireAuditAvailable } from '../../../middleware/require-audit-available.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody } from '../../../shared/validation.js';
import {
  amendFeeStructureHandler,
  createFeeStructureHandler,
  getFeeStructureHandler,
  listFeeStructuresHandler,
  updateFeeStructureHandler,
} from '../handlers/index.js';

/**
 * Fee structure routes (SRS §4.6 FR-FIN-001; US-FIN-001). Configuration is an
 * Accountant capability (permission matrix); Principals additionally read.
 * Writes carry Idempotency-Key (loomis-api / loomis-financial-integrity).
 * Amending after the term opens routes to Workflow for Principal approval.
 */
export async function feeStructuresRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateFeeStructureRequest }>(
    '/tenants/:tenantId/fee-structures',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(createFeeStructureRequest)],
    },
    createFeeStructureHandler,
  );

  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/fee-structures',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('accountant', 'principal')],
    },
    listFeeStructuresHandler,
  );

  app.get<{ Params: { tenantId: string; feeStructureId: string } }>(
    '/tenants/:tenantId/fee-structures/:feeStructureId',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('accountant', 'principal')],
    },
    getFeeStructureHandler,
  );

  app.put<{ Params: { tenantId: string; feeStructureId: string }; Body: UpdateFeeStructureRequest }>(
    '/tenants/:tenantId/fee-structures/:feeStructureId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(updateFeeStructureRequest)],
    },
    updateFeeStructureHandler,
  );

  app.post<{
    Params: { tenantId: string; feeStructureId: string };
    Body: AmendFeeStructureRequest;
  }>(
    '/tenants/:tenantId/fee-structures/:feeStructureId/amendments',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(amendFeeStructureRequest)],
    },
    amendFeeStructureHandler,
  );
}
