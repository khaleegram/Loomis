import type { FastifyInstance } from 'fastify';
import { registerStudentEventConsumers } from './events/index.js';
import { admissionsRoutes } from './routes/admissions.routes.js';
import { studentsRoutes } from './routes/students.routes.js';

/**
 * Student module plugin (Phase 1, step 5). Admissions, enrollment, parent
 * links, and student records (loomis-module-patterns).
 */
export async function studentModule(app: FastifyInstance): Promise<void> {
  registerStudentEventConsumers();
  await app.register(admissionsRoutes);
  await app.register(studentsRoutes);
}
