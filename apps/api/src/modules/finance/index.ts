import type { FastifyInstance } from 'fastify';
import { registerFinanceEventConsumers } from './events/index.js';
import { feeStructuresRoutes } from './routes/fee-structures.routes.js';
import { invoicesRoutes } from './routes/invoices.routes.js';
import { paymentsRoutes } from './routes/payments.routes.js';
import { webhooksRoutes } from './routes/webhooks.routes.js';

/**
 * Finance module plugin (Phase 2). Fee structures, invoicing, and payments
 * (SRS §4.6; US-FIN-001..005). Registers workflow and webhook event consumers.
 */
export async function financeModule(app: FastifyInstance): Promise<void> {
  registerFinanceEventConsumers();
  await app.register(feeStructuresRoutes);
  await app.register(invoicesRoutes);
  await app.register(paymentsRoutes);
  await app.register(webhooksRoutes);
}

export { feeStructureService, invoiceService, paymentService } from './services/index.js';
