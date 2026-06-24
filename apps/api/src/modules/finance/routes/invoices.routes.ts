import type { FastifyInstance } from 'fastify';
import {
  batchIssueInvoicesRequest,
  bulkFeeReminderRequest,
  issueInvoiceRequest,
  outstandingBalancesQuery,
  updateFeeReminderSettingsRequest,
  type BatchIssueInvoicesRequest,
  type BulkFeeReminderRequest,
  type IssueInvoiceRequest,
  type OutstandingBalancesQuery,
  type UpdateFeeReminderSettingsRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireAuditAvailable } from '../../../middleware/require-audit-available.js';
import { requireCapability } from '../../../middleware/require-capability.js';
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
  sendFeeReminderHandler,
  bulkFeeReminderHandler,
  getFeeReminderSettingsHandler,
  updateFeeReminderSettingsHandler,
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
        requireAuditAvailable,
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
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(batchIssueInvoicesRequest)],
    },
    batchIssueInvoicesHandler,
  );

  app.get<{ Params: { tenantId: string; termId: string } }>(
    '/tenants/:tenantId/terms/:termId/invoices',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('accountant', 'cashier', 'principal', 'school_owner'),
      ],
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
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireCapability('finance.balances.view'),
      ],
      preValidation: [validateQuery(outstandingBalancesQuery)],
    },
    outstandingBalancesHandler,
  );

  app.post<{ Params: { tenantId: string; studentId: string } }>(
    '/tenants/:tenantId/students/:studentId/fee-reminders',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireCapability('finance.balances.view'),
        requireRole('accountant', 'principal', 'school_owner'),
      ],
    },
    sendFeeReminderHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: BulkFeeReminderRequest }>(
    '/tenants/:tenantId/fee-reminders/bulk',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireCapability('finance.balances.view'),
        requireRole('accountant', 'principal', 'school_owner'),
      ],
      preValidation: [validateBody(bulkFeeReminderRequest)],
    },
    bulkFeeReminderHandler,
  );

  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/finance/fee-reminder-settings',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireCapability('finance.balances.view'),
        requireRole('accountant', 'principal', 'school_owner'),
      ],
    },
    getFeeReminderSettingsHandler,
  );

  app.put<{ Params: { tenantId: string }; Body: UpdateFeeReminderSettingsRequest }>(
    '/tenants/:tenantId/finance/fee-reminder-settings',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireCapability('finance.balances.view'),
        requireRole('accountant', 'principal', 'school_owner'),
      ],
      preValidation: [validateBody(updateFeeReminderSettingsRequest)],
    },
    updateFeeReminderSettingsHandler,
  );
}
