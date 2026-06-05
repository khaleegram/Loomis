import type { FastifyInstance } from 'fastify';
import { registerMalwareScanHook } from './events/index.js';
import { storageRoutes } from './routes/storage.routes.js';

/** Storage module plugin — pre-signed S3 URLs and object metadata (System Design §10). */
export async function storageModule(app: FastifyInstance): Promise<void> {
  registerMalwareScanHook();
  await app.register(storageRoutes);
}
