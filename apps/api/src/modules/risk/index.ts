import type { FastifyInstance } from 'fastify';
import { startIvpBatchJob } from './jobs/ivp-batch.job.js';
import { breakGlassRoutes } from './routes/break-glass.routes.js';
import { ivpRoutes } from './routes/ivp.routes.js';
import { privilegedChangeRoutes } from './routes/privileged-change.routes.js';

/**
 * Risk / IVP module plugin (Revenue Integrity §IVP; System Design §8.2).
 * IVP anomaly detection, privileged change governance, and break-glass access.
 */
export async function riskModule(app: FastifyInstance): Promise<void> {
  await app.register(ivpRoutes);
  await app.register(privilegedChangeRoutes);
  await app.register(breakGlassRoutes);
  await startIvpBatchJob();
}

export {
  breakGlassService,
  ivpBatchService,
  ivpCaseService,
  privilegedChangeService,
} from './services/index.js';
