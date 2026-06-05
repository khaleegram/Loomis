import type { FastifyInstance } from 'fastify';
import { deregisterDeviceRequest, type DeregisterDeviceRequest } from '@loomis/contracts';
import { authenticate } from '../../../middleware/authenticate.js';
import { validateBody } from '../../../shared/validation.js';
import { deregisterDeviceHandler, listDevicesHandler } from '../handlers/devices.handler.js';

/** Registered-device management routes for US-HRM-008 (security settings). */
export async function devicesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/identity/devices', { preHandler: [authenticate] }, listDevicesHandler);

  app.post<{ Body: DeregisterDeviceRequest }>(
    '/identity/devices/deregister',
    { preHandler: [authenticate], preValidation: [validateBody(deregisterDeviceRequest)] },
    deregisterDeviceHandler,
  );
}
