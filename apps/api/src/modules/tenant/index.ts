import type { FastifyInstance } from 'fastify';
import { registerTenantEventConsumers } from './events/index.js';
import { brandingRoutes } from './routes/branding.routes.js';
import { configurationsRoutes } from './routes/configurations.routes.js';
import { experienceRoutes } from './routes/experience.routes.js';
import { onboardingRoutes } from './routes/onboarding.routes.js';
import { platformPsfRoutes } from './routes/platform-psf.routes.js';
import { platformTenantsRoutes } from './routes/platform-tenants.routes.js';
import { platformTierAdminRoutes } from './routes/platform-tier-admin.routes.js';
import { provisionDraftRoutes } from './routes/provision-draft.routes.js';
import { psfRateRoutes } from './routes/psf-rate.routes.js';
import { tenantsRoutes } from './routes/tenants.routes.js';

/** Tenant module plugin — registers all tenant routes (loomis-module-patterns). */
export async function tenantModule(app: FastifyInstance): Promise<void> {
  registerTenantEventConsumers();
  await app.register(platformTenantsRoutes);
  await app.register(platformTierAdminRoutes);
  await app.register(platformPsfRoutes);
  await app.register(provisionDraftRoutes);
  await app.register(onboardingRoutes);
  await app.register(tenantsRoutes);
  await app.register(brandingRoutes);
  await app.register(experienceRoutes);
  await app.register(psfRateRoutes);
  await app.register(configurationsRoutes);
}
