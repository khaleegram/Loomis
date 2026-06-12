import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UpdateProfileRequest } from '@loomis/contracts';
import { userRepository } from '../repository/user.repository.js';
import { sendSuccess } from '../../../shared/http.js';
import { LoomisError } from '../../../shared/errors.js';

export async function getProfileHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userId = req.authUser!.sub;
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new LoomisError('INTERNAL_ERROR', 500, 'Authenticated user not found in database');
  }
  return sendSuccess(reply, {
    displayName: user.displayName,
    email: user.email,
    photoStorageObjectId: user.photoStorageObjectId,
    role: user.role,
    tenantId: user.tenantId,
  });
}

export async function updateProfileHandler(
  req: FastifyRequest<{ Body: UpdateProfileRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const userId = req.authUser!.sub;
  const { displayName, email, photoStorageObjectId } = req.body;

  if (!displayName && !email && photoStorageObjectId === undefined) {
    throw new LoomisError('VALIDATION_ERROR', 422, 'At least one field is required');
  }

  const fields: { displayName?: string; email?: string; photoStorageObjectId?: string | null } = {};
  if (displayName !== undefined) fields.displayName = displayName;
  if (email !== undefined) fields.email = email;
  if (photoStorageObjectId !== undefined) fields.photoStorageObjectId = photoStorageObjectId;

  const updated = await userRepository.updateProfile(userId, fields);
  if (!updated) {
    throw new LoomisError('INTERNAL_ERROR', 500, 'Failed to update profile');
  }

  return sendSuccess(reply, {
    displayName: updated.displayName,
    email: updated.email,
    photoStorageObjectId: updated.photoStorageObjectId,
  });
}
