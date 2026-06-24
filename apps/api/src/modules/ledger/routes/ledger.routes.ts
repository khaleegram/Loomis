import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { authenticate } from '../../../middleware/authenticate.js';
import { requireCapability } from '../../../middleware/require-capability.js';
import { requireIdempotencyKey } from '../../../middleware/require-idempotency-key.js';
import { requireRole } from '../../../middleware/require-role.js';
import { requireStepUp } from '../../../middleware/require-step-up.js';
import { requireTenantMatch } from '../../../middleware/require-tenant-match.js';
import { psfObligations, ledgerEntries } from '../../../../drizzle/schema/ledger.js';
import { db } from '../../../shared/db.js';
import { sendSuccess } from '../../../shared/http.js';
import { platformRevenueReadService } from '../services/platform-revenue.read-service.js';

export async function ledgerRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { tenantId: string } }>(
    '/tenants/:tenantId/psf-obligations',
    {
      preHandler: [authenticate, requireTenantMatch, requireCapability('ledger.view')],
    },
    async (req, reply) => {
      const rows = await db
        .select()
        .from(psfObligations)
        .where(eq(psfObligations.tenantId, req.params.tenantId))
        .orderBy(desc(psfObligations.createdAt))
        .limit(200);
      return sendSuccess(reply, { obligations: rows });
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
    '/platform/ledger/revenue/summary',
    { preHandler: [authenticate, requireRole('platform_owner', 'platform_admin', 'dpo')] },
    async (_req, reply) => {
      const summary = await platformRevenueReadService.getSummary();
      return reply.send({ status: 'success', data: summary });
    },
  );

  app.get<{ Querystring: { period?: string } }>(
    '/platform/ledger/revenue/chart',
    { preHandler: [authenticate, requireRole('platform_owner', 'platform_admin', 'dpo')] },
    async (req, reply) => {
      const chart = await platformRevenueReadService.getChart(req.query.period ?? '12m');
      return reply.send({ status: 'success', data: chart });
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
      return sendSuccess(reply, { entries: rows });
    },
  );
}
