import type { FastifyInstance } from 'fastify';
import { registerFinanceEventConsumers } from './events/index.js';
import { feeStructuresRoutes } from './routes/fee-structures.routes.js';
import { invoicesRoutes } from './routes/invoices.routes.js';

/**
 * Finance module plugin (Phase 2). Fee structure configuration and invoicing
 * (SRS §4.6; US-FIN-001, US-FIN-005). Payments, refunds and reconciliation land
 * in later chats. Registers the `workflow.completed` consumer that applies an
 * approved fee-structure amendment.
 */
export async function financeModule(app: FastifyInstance): Promise<void> {
  registerFinanceEventConsumers();
  await app.register(feeStructuresRoutes);
  await app.register(invoicesRoutes);
}

export { feeStructureService, invoiceService } from './services/index.js';
