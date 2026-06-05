import type { FastifyInstance } from 'fastify';
import { configurationsRoutes } from './routes/configurations.routes.js';
import { psfRateRoutes } from './routes/psf-rate.routes.js';
import { tenantsRoutes } from './routes/tenants.routes.js';

/** Tenant module plugin — registers all tenant routes (loomis-module-patterns). */
export async function tenantModule(app: FastifyInstance): Promise<void> {
  await app.register(tenantsRoutes);
  await app.register(psfRateRoutes);
  await app.register(configurationsRoutes);
}
