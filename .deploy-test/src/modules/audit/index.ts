import type { FastifyInstance } from 'fastify';
import { auditRoutes } from './routes/audit.routes.js';

export async function auditModule(app: FastifyInstance): Promise<void> {
  await app.register(auditRoutes);
}
