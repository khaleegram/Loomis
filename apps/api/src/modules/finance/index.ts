import type { FastifyInstance } from 'fastify';
import { registerFinanceEventConsumers } from './events/index.js';
import { feeStructuresRoutes } from './routes/fee-structures.routes.js';
import { invoicesRoutes } from './routes/invoices.routes.js';
import { paymentsRoutes } from './routes/payments.routes.js';
import { reconciliationRoutes, refundsRoutes } from './routes/refunds.routes.js';
import { webhooksRoutes } from './routes/webhooks.routes.js';
import { startGatewayReconciliationJob } from './jobs/gateway-reconciliation.job.js';

/**
 * Finance module plugin (Phase 2). Fee structures, invoicing, payments, refunds,
 * and gateway reconciliation (SRS §4.6, §10.1; US-FIN-001..007).
 */
export async function financeModule(app: FastifyInstance): Promise<void> {
  registerFinanceEventConsumers();
  await startGatewayReconciliationJob();
  await app.register(feeStructuresRoutes);
  await app.register(invoicesRoutes);
  await app.register(paymentsRoutes);
  await app.register(refundsRoutes);
  await app.register(reconciliationRoutes);
  await app.register(webhooksRoutes);
}

export {
  feeStructureService,
  invoiceService,
  paymentService,
  refundService,
  reconciliationService,
} from './services/index.js';
