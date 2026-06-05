import type { FastifyInstance } from 'fastify';
import { admissionsRoutes } from './routes/admissions.routes.js';
import { studentsRoutes } from './routes/students.routes.js';

/**
 * Student module plugin (Phase 1, step 5). Admissions, enrollment, parent
 * links, and student records (loomis-module-patterns).
 */
export async function studentModule(app: FastifyInstance): Promise<void> {
  await app.register(admissionsRoutes);
  await app.register(studentsRoutes);
}
