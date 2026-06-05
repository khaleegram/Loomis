import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateUploadUrlRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { storageService } from '../services/storage.service.js';
import { requireTenantActor } from './_context.js';

interface StorageObjectParams {
  id: string;
}

/** POST /storage/upload-url — pre-signed S3 PUT URL (System Design §10.2). */
export async function createUploadUrlHandler(
  req: FastifyRequest<{ Body: CreateUploadUrlRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireTenantActor(req);
  const result = await storageService.createUploadUrl(req.body, actor, req.id);
  return sendSuccess(reply, result, 201);
}

/** GET /storage/objects/:id/url — pre-signed S3 GET URL (System Design §10.3). */
export async function getDownloadUrlHandler(
  req: FastifyRequest<{ Params: StorageObjectParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireTenantActor(req);
  const result = await storageService.getDownloadUrl(req.params.id, actor, req.id, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });
  return sendSuccess(reply, result);
}
