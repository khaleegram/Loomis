import { and, desc, eq } from 'drizzle-orm';
import { privilegedChangeRequests } from '../../../../drizzle/schema/risk.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const privilegedChangeRepository = {
  async create(
    input: {
      changeType: string;
      targetTenantId: string | null;
      requestedByUserId: string;
      beforeJson: Record<string, unknown>;
      afterJson: Record<string, unknown>;
      reason: string;
      riskScore: number;
    },
    tx?: Executor,
  ) {
    const run = async (executor: Executor) => {
      const [row] = await executor
        .insert(privilegedChangeRequests)
        .values({
          changeType: input.changeType,
          targetTenantId: input.targetTenantId,
          requestedByUserId: input.requestedByUserId,
          beforeJson: input.beforeJson,
          afterJson: input.afterJson,
          reason: input.reason,
          riskScore: input.riskScore,
          status: 'requested',
        })
        .returning();
      if (!row) throw new Error('Failed to create privileged change request');
      return row;
    };
    if (tx) return run(tx);
    return withTenantContext(null, run);
  },

  async findById(id: string) {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select()
        .from(privilegedChangeRequests)
        .where(eq(privilegedChangeRequests.id, id))
        .limit(1);
      return row ?? null;
    });
  },

  async listRecent(limit = 50) {
    return withTenantContext(null, async (tx) =>
      tx.select().from(privilegedChangeRequests).orderBy(desc(privilegedChangeRequests.createdAt)).limit(limit),
    );
  },

  async decide(
    id: string,
    patch: {
      status: 'approved' | 'rejected';
      approvedByUserId?: string;
      approvedAt?: Date;
    },
  ) {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .update(privilegedChangeRequests)
        .set(patch)
        .where(
          and(eq(privilegedChangeRequests.id, id), eq(privilegedChangeRequests.status, 'requested')),
        )
        .returning();
      return row ?? null;
    });
  },

  async markExecuted(id: string) {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .update(privilegedChangeRequests)
        .set({ status: 'executed', executedAt: new Date() })
        .where(and(eq(privilegedChangeRequests.id, id), eq(privilegedChangeRequests.status, 'approved')))
        .returning();
      return row ?? null;
    });
  },
};
