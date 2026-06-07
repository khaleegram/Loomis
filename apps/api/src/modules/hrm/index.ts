import type { FastifyInstance } from 'fastify';
import { staffRoutes } from './routes/staff.routes.js';
import { invitationRoutes } from './routes/invitation.routes.js';

export async function hrmModule(app: FastifyInstance): Promise<void> {
  await app.register(staffRoutes);
  await app.register(invitationRoutes);
}
