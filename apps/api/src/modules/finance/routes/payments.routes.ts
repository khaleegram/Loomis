import type { FastifyInstance } from 'fastify';
import {
  initializeOnlinePaymentRequest,
  logOfflinePaymentRequest,
  paymentsQuery,
  verifyOfflinePaymentRequest,
  type InitializeOnlinePaymentRequest,
  type LogOfflinePaymentRequest,
  type PaymentsQuery,
  type VerifyOfflinePaymentRequest,
} from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireAuditAvailable } from '../../../middleware/require-audit-available.js';
import { requireCapability } from '../../../middleware/require-capability.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { validateBody, validateQuery } from '../../../shared/validation.js';
import {
  getPaymentHandler,
  getPaymentGatewayConfigHandler,
  initializeOnlinePaymentHandler,
  listPaymentsHandler,
  logOfflinePaymentHandler,
  sendParentPaymentOtpHandler,
  verifyOfflinePaymentHandler,
} from '../handlers/index.js';

/**
 * Payment routes (SRS §4.6 FR-FIN-004/005; US-FIN-002..004).
 * Offline log = Cashier; verify = Accountant (SoD enforced in service).
 * Online init = Parent. All writes require Idempotency-Key.
 */
export async function paymentsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/finance/payment-gateway/config',
    { preHandler: [authenticate] },
    getPaymentGatewayConfigHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: LogOfflinePaymentRequest }>(
    '/tenants/:tenantId/payments/offline',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireCapability('payment.log'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(logOfflinePaymentRequest)],
    },
    logOfflinePaymentHandler,
  );

  app.post<{ Params: { tenantId: string; paymentId: string }; Body: VerifyOfflinePaymentRequest }>(
    '/tenants/:tenantId/payments/:paymentId/verify',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireCapability('payment.verify'),
        requireAuditAvailable,
        requireIdempotencyKey,
      ],
      preValidation: [validateBody(verifyOfflinePaymentRequest)],
    },
    verifyOfflinePaymentHandler,
  );

  app.post<{ Params: { tenantId: string }; Body: InitializeOnlinePaymentRequest }>(
    '/tenants/:tenantId/payments/online/initialize',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent'), requireAuditAvailable, requireIdempotencyKey],
      preValidation: [validateBody(initializeOnlinePaymentRequest)],
    },
    initializeOnlinePaymentHandler,
  );

  app.post<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/payments/online/send-otp',
    {
      preHandler: [authenticate, requireTenantMatch, requireRole('parent')],
    },
    sendParentPaymentOtpHandler,
  );

  app.get<{ Params: { tenantId: string }; Querystring: PaymentsQuery }>(
    '/tenants/:tenantId/payments',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('cashier', 'accountant', 'principal'),
      ],
      preValidation: [validateQuery(paymentsQuery)],
    },
    listPaymentsHandler,
  );

  app.get<{ Params: { tenantId: string; paymentId: string } }>(
    '/tenants/:tenantId/payments/:paymentId',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('cashier', 'accountant', 'principal', 'parent'),
      ],
    },
    getPaymentHandler,
  );
}
