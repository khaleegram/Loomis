import type { FastifyInstance } from 'fastify';
import {
  createRefundRequest,
  reconciliationExceptionsQuery,
  refundsQuery,
  requestPsfReversalRequest,
  resolveReconciliationExceptionRequest,
  type CreateRefundRequest,
  type ReconciliationExceptionsQuery,
  type RefundsQuery,
  type RequestPsfReversalRequest,
  type ResolveReconciliationExceptionRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireAuditAvailable } from '../../../middleware/require-audit-available.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  createRefundHandler,
  getRefundHandler,
  listRefundsHandler,
  listReconciliationExceptionsHandler,
  listPlatformReconciliationExceptionsHandler,
  requestPsfReversalHandler,
  resolveReconciliationExceptionHandler,
  runReconciliationHandler,
} from '../handlers/index.js';

/**
 * Refund routes (SRS §4.6 FR-FIN-007; US-FIN-006).
 * Initiation = Cashier; approval via Workflow with step-up MFA at each approve step.
 */
export async function refundsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: CreateRefundRequest }>(
    '/tenants/:tenantId/refunds',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('cashier'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(createRefundRequest)],
    },
    createRefundHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: RefundsQuery }>(
    '/tenants/:tenantId/refunds',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('cashier', 'accountant', 'principal', 'school_owner'),
      ],
      preValidation: [validateQuery(refundsQuery)],
    },
    listRefundsHandler,
  );

  app.get<{ Params: { tenantId: string; refundId: string } }>(
    '/tenants/:tenantId/refunds/:refundId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('cashier', 'accountant', 'principal', 'school_owner'),
      ],
    },
    getRefundHandler,
  );

  app.post<{ Params: { tenantId: string; refundId: string }; Body: RequestPsfReversalRequest }>(
    '/tenants/:tenantId/refunds/:refundId/psf-reversal',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_admin', 'platform_owner'),
        requireStepUp('ledger_adjustment'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(requestPsfReversalRequest)],
    },
    requestPsfReversalHandler,
  );
}

/**
 * Reconciliation routes (SRS §10.1; US-FIN-007).
 * Exceptions are flagged by the nightly BullMQ job; resolution is manual.
 */
export async function reconciliationRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string }; Querystring: ReconciliationExceptionsQuery }>(
    '/tenants/:tenantId/reconciliation/exceptions',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant', 'platform_admin', 'platform_owner'),
      ],
      preValidation: [validateQuery(reconciliationExceptionsQuery)],
    },
    listReconciliationExceptionsHandler,
  );

  app.post<{ Params: { tenantId: string; exceptionId: string }; Body: ResolveReconciliationExceptionRequest }>(
    '/tenants/:tenantId/reconciliation/exceptions/:exceptionId/resolve',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant', 'platform_admin', 'platform_owner'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(resolveReconciliationExceptionRequest)],
    },
    resolveReconciliationExceptionHandler,
  );

  app.post(
    '/reconciliation/run',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_admin', 'platform_owner'),
        requireAuditAvailable,
      ],
    },
    runReconciliationHandler,
  );

  app.get<{ Querystring: ReconciliationExceptionsQuery }>(
    '/reconciliation/exceptions',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_admin', 'platform_owner'),
      ],
      preValidation: [validateQuery(reconciliationExceptionsQuery)],
    },
    listPlatformReconciliationExceptionsHandler,
  );
}
