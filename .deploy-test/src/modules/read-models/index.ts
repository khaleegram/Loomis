import type { FastifyInstance } from 'fastify';
import { registerReadModelEventConsumers } from './events/index.js';
import { readModelsRoutes } from './routes/read-models.routes.js';

/**
 * Read models module (System Design §6.2).
 * Denormalized projections maintained by outbox event consumers.
 */
export async function readModelsModule(app: FastifyInstance): Promise<void> {
  registerReadModelEventConsumers();
  await app.register(readModelsRoutes);
}

export {
  parentDashboardReadService,
  readModelProjectionService,
  regionalAnalyticsReadService,
} from './services/index.js';
