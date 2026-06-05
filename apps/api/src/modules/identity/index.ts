import type { FastifyInstance } from 'fastify';
import { authRoutes } from './routes/auth.routes.js';

/** Identity module plugin — registers all identity routes (loomis-module-patterns). */
export async function identityModule(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes);
}
