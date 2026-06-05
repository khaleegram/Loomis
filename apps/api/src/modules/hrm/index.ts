import type { FastifyInstance } from 'fastify';
import { staffRoutes } from './routes/staff.routes.js';

/** HRM module plugin — staff onboarding, assignments, roles, and deactivation. */
export async function hrmModule(app: FastifyInstance): Promise<void> {
  await app.register(staffRoutes);
}
