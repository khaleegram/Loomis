import type { FastifyInstance } from 'fastify';
import { registerHrmEventConsumers } from './events/register-consumers.js';
import { staffRoutes } from './routes/staff.routes.js';
import { invitationRoutes } from './routes/invitation.routes.js';

export async function hrmModule(app: FastifyInstance): Promise<void> {
  registerHrmEventConsumers();
  await app.register(staffRoutes);
  await app.register(invitationRoutes);
}
