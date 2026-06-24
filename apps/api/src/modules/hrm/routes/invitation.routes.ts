import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { requireRole } from '../../../middleware/require-role.js';
import { sendSuccess } from '../../../shared/http.js';
import { staffService } from '../services/staff.service.js';
import { requireActor } from '../handlers/_context.js';

export async function invitationRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string; invitationId: string } }>(
    '/tenants/:tenantId/staff/:invitationId/resend',
    { preHandler: [authenticate, requireTenantMatch, requireRole('admin_officer', 'school_owner', 'principal')] },
    async (req, reply) => {
      const result = await staffService.resendInvitation(
        req.params.tenantId,
        req.params.invitationId,
        requireActor(req),
      );
      return sendSuccess(reply, result);
    },
  );
}
