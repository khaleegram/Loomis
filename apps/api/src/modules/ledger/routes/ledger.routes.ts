import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireRole } from '../../../middleware/require-role.js';
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
