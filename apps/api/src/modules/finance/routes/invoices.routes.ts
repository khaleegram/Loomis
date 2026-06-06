import type { FastifyInstance } from 'fastify';
import {
  batchIssueInvoicesRequest,
  issueInvoiceRequest,
  outstandingBalancesQuery,
  type BatchIssueInvoicesRequest,
  type IssueInvoiceRequest,
  type OutstandingBalancesQuery,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  batchIssueInvoicesHandler,
  getInvoiceHandler,
  issueInvoiceHandler,
  listInvoicesHandler,
  outstandingBalancesHandler,
} from '../handlers/index.js';

/**
 * Invoice routes (SRS §4.6 FR-FIN-004; US-FIN-005). Issuing is an Accountant
 * capability; outstanding balances are visible to Accountant and Principal only
 * (US-FIN-005). Writes carry Idempotency-Key (loomis-financial-integrity).
 */
export async function invoicesRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string }; Body: IssueInvoiceRequest }>(
    '/tenants/:tenantId/invoices',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(issueInvoiceRequest)],
    },
    issueInvoiceHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: BatchIssueInvoicesRequest }>(
    '/tenants/:tenantId/invoices/batch',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant'),
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(batchIssueInvoicesRequest)],
    },
    batchIssueInvoicesHandler,
  );

  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/invoices',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('accountant', 'principal')],
    },
    listInvoicesHandler,
  );

  app.get<{ Params: { tenantId: string; invoiceId: string } }>(
    '/tenants/:tenantId/invoices/:invoiceId',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('accountant', 'principal')],
    },
    getInvoiceHandler,
  );

  app.get<{
    Params: { tenantId: string; termId: string };
    Querystring: OutstandingBalancesQuery;
  }>(
    '/tenants/:tenantId/terms/:termId/outstanding-balances',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('accountant', 'principal')],
      preValidation: [validateQuery(outstandingBalancesQuery)],
    },
    outstandingBalancesHandler,
  );
}
