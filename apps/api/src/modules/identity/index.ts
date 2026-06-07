import type { FastifyInstance } from 'fastify';
import { registerIdentityEventConsumers } from './events/index.js';
import { authRoutes } from './routes/auth.routes.js';
import { contactRoutes } from './routes/contact.routes.js';
import { devicesRoutes } from './routes/devices.routes.js';
import { sessionsRoutes } from './routes/sessions.routes.js';

/** Identity module plugin — registers all identity routes (loomis-module-patterns). */
export async function identityModule(app: FastifyInstance): Promise<void> {
  registerIdentityEventConsumers();
  await app.register(authRoutes);
  await app.register(sessionsRoutes);
  await app.register(devicesRoutes);
  await app.register(contactRoutes);
}
