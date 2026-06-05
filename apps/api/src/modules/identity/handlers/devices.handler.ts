import type { FastifyReply, FastifyRequest } from 'fastify';
import type { DeregisterDeviceRequest } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { deviceService } from '../services/device.service.js';

/** GET /identity/devices — list the caller's registered devices (US-HRM-008). */
export async function listDevicesHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  const devices = await deviceService.listDevicesForUser(user.sub);
  return sendSuccess(reply, { devices });
}

/** POST /identity/devices/deregister — invalidate a device's persistent token. */
export async function deregisterDeviceHandler(
  req: FastifyRequest<{ Body: DeregisterDeviceRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  await deviceService.deregisterDeviceForUser(user.sub, req.body.deviceId);
  return sendSuccess(reply, { deregistered: true });
}
