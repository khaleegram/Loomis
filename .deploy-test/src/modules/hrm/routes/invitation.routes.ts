import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { requireRole } from '../../../middleware/require-role.js';
import { staffInvitations } from '../../../../drizzle/schema/hrm.js';
import { db } from '../../../shared/db.js';

export async function invitationRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tenantId: string; invitationId: string } }>(
    '/tenants/:tenantId/staff/:invitationId/resend',
    { preHandler: [authenticate, requireTenantMatch, requireRole('admin_officer', 'school_owner', 'principal')] },
    async (req, reply) => {
      const { invitationId } = req.params;
      const [invitation] = await db
        .select()
        .from(staffInvitations)
        .where(eq(staffInvitations.id, invitationId))
        .limit(1);

      if (!invitation) return reply.status(404).send({ error: 'Invitation not found' });
      if (invitation.acceptedAt || invitation.revokedAt) {
        return reply.status(409).send({ error: 'Invitation is no longer pending' });
      }

      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await db
        .update(staffInvitations)
        .set({ expiresAt: newExpiry, updatedAt: new Date() } as any)
        .where(eq(staffInvitations.id, invitationId));

      return reply.send({ status: 'resent', expiresAt: newExpiry.toISOString() });
    },
  );
}
