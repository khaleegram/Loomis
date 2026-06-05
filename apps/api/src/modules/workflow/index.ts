import type { FastifyInstance } from 'fastify';
import { workflowsRoutes } from './routes/workflows.routes.js';

/**
 * Workflow module plugin (Phase 2). Approval engine for privileged changes,
 * refunds, grade corrections, and other multi-step approvals (SRS §4.10).
 */
export async function workflowModule(app: FastifyInstance): Promise<void> {
  await app.register(workflowsRoutes);
}

export { workflowService } from './services/index.js';
