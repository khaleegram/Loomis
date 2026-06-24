import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
import { validateBody } from '../../../shared/validation.js';
import {
  approveBillingAdjustmentHandler,
  listPendingBillingAdjustmentsHandler,
  rejectBillingAdjustmentHandler,
} from '../handlers/adjustment.handler.js';

const rejectBody = z.object({
  rejectionReason: z.string().min(3).max(500),
});

/** Platform Ops billing adjustment approval queue. */
export async function platformBillingAdjustmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/admin/billing/adjustments',
    {
      preHandler: [authenticate, requireRole('platform_owner', 'platform_admin')],
    },
    listPendingBillingAdjustmentsHandler,
  );

  app.post<{ Params: { id: string } }>(
    '/admin/billing/adjustments/:id/approve',
    {
      preHandler: [authenticate, requireRole('platform_owner', 'platform_admin')],
    },
    approveBillingAdjustmentHandler,
  );

  app.post<{ Params: { id: string }; Body: z.infer<typeof rejectBody> }>(
    '/admin/billing/adjustments/:id/reject',
    {
      preHandler: [authenticate, requireRole('platform_owner', 'platform_admin')],
      preValidation: [validateBody(rejectBody)],
    },
    rejectBillingAdjustmentHandler,
  );
}
