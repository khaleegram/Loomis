import type { FastifyInstance } from 'fastify';
import { publicWebsiteRoutes, websiteRoutes } from './routes/website.routes.js';

export async function websiteModule(app: FastifyInstance): Promise<void> {
  await app.register(websiteRoutes);
  await app.register(publicWebsiteRoutes);
}
