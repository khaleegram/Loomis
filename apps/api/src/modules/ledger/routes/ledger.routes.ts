import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { psfObligations, ledgerEntries } from '../../../../drizzle/schema/ledger.js';
import { db } from '../../../shared/db.js';

export async function ledgerRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/psf-obligations',
    { preHandler: [authenticate, requireTenantMatch, requireRole('school_owner', 'principal', 'accountant')] },
    async (req, reply) => {
      const rows = await db
        .select()
        .from(psfObligations)
        .where(eq(psfObligations.tenantId, req.params.tenantId))
        .orderBy(desc(psfObligations.createdAt))
        .limit(200);
      return reply.send({ obligations: rows });
    },
  );

  app.post<{ Params: { tenantId: string; obligationId: string }; Body: { reason: string } }>(
    '/tenants/:tenantId/psf-obligations/:obligationId/waive',
    {
      preHandler: [
        authenticate,
        requireTenantMatch,
        requireRole('platform_admin', 'platform_owner'),
        requireStepUp('financial_override'),
        requireIdempotencyKey,
      ],
    },
    async (req, reply) => {
      const { obligationId, tenantId } = req.params;
      const { reason } = req.body;
      const [obligation] = await db
        .select()
        .from(psfObligations)
        .where(eq(psfObligations.id, obligationId))
        .limit(1);
      if (!obligation) {
        return reply.status(404).send({ error: 'PSF obligation not found' });
      }
      if (obligation.status === 'waived') {
        return reply.status(409).send({ error: 'Obligation already waived' });
      }
      await db
        .update(psfObligations)
        .set({ status: 'waived', notes: reason } as any)
        .where(eq(psfObligations.id, obligationId));
      return reply.send({ status: 'waived', obligationId });
    },
  );

  app.get(
    '/platform/ledger/entries',
    { preHandler: [authenticate, requireRole('platform_owner', 'platform_admin')] },
    async (_req, reply) => {
      const rows = await db
        .select()
        .from(ledgerEntries)
        .orderBy(desc(ledgerEntries.createdAt))
        .limit(200);
      return reply.send({ entries: rows });
    },
  );
}
