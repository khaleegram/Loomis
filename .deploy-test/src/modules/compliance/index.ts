import type { FastifyInstance } from 'fastify';
import { startComplianceJobs } from './jobs/compliance.jobs.js';
import { complianceRoutes } from './routes/compliance.routes.js';

/**
 * Compliance module plugin (NDPA; System Design §19; US-AUD-002..005).
 * DSAR pipeline, breach records, consent versions, and retention engine.
 */
export async function complianceModule(app: FastifyInstance): Promise<void> {
  await app.register(complianceRoutes);
  await startComplianceJobs();
}

export {
  breachService,
  consentService,
  dashboardService,
  dsarService,
  retentionService,
} from './services/index.js';
