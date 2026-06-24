import type { FastifyInstance } from 'fastify';
import { registerLedgerEventConsumers } from './events/index.js';
import { startBalanceCheckJob } from './jobs/balance-check.job.js';
import { startOutboxRelayJob } from './jobs/outbox-relay.job.js';
import { ledgerRoutes } from './routes/ledger.routes.js';

/**
 * Ledger module plugin (Revenue Integrity §A/B; System Design §8.1/§8.3).
 * Owns PSF obligations, settlements, immutable double-entry ledger, outbox relay,
 * and nightly balance-check job. Read-only query routes exposed for school and
 * platform dashboards.
 */
export async function ledgerModule(app: FastifyInstance): Promise<void> {
  await app.register(ledgerRoutes);
  registerLedgerEventConsumers();
  await startOutboxRelayJob();
  await startBalanceCheckJob();
}

export {
  balanceCheckService,
  ledgerService,
  obligationService,
  settlementService,
} from './services/index.js';
export { obligationRepository } from './repository/index.js';
