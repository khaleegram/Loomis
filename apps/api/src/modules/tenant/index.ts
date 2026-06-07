import type { FastifyInstance } from 'fastify';
import { registerTenantEventConsumers } from './events/index.js';
import { configurationsRoutes } from './routes/configurations.routes.js';
import { platformTenantsRoutes } from './routes/platform-tenants.routes.js';
import { psfRateRoutes } from './routes/psf-rate.routes.js';
import { tenantsRoutes } from './routes/tenants.routes.js';

/** Tenant module plugin — registers all tenant routes (loomis-module-patterns). */
export async function tenantModule(app: FastifyInstance): Promise<void> {
  registerTenantEventConsumers();
  await app.register(platformTenantsRoutes);
  await app.register(tenantsRoutes);
  await app.register(psfRateRoutes);
  await app.register(configurationsRoutes);
}
