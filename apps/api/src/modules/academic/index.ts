import type { FastifyInstance } from 'fastify';
import { registerAcademicEventConsumers } from './events/index.js';
import { academicYearsRoutes } from './routes/academic-years.routes.js';
import { censusRoutes } from './routes/census.routes.js';
import { classStructureRoutes } from './routes/class-structure.routes.js';
import { gradebookRoutes } from './routes/gradebook.routes.js';
import { promotionRoutes } from './routes/promotion.routes.js';
import { termsRoutes } from './routes/terms.routes.js';

/**
 * Academic Session module plugin (Phase 1, step 4). Years, terms, census lock,
 * class structure, and promotion (loomis-module-patterns).
 */
export async function academicModule(app: FastifyInstance): Promise<void> {
  registerAcademicEventConsumers();
  await app.register(academicYearsRoutes);
  await app.register(termsRoutes);
  await app.register(censusRoutes);
  await app.register(classStructureRoutes);
  await app.register(promotionRoutes);
  await app.register(gradebookRoutes);
}
