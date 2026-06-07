import { desc, eq } from 'drizzle-orm';
import { payoutCycles } from '../../../../drizzle/schema/referral.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { PayoutCycleStatus, ReferralRulesSnapshot } from '@loomis/contracts';

export const payoutRepository = {
  async findById(tx: Executor, id: string) {
    const [row] = await tx.select().from(payoutCycles).where(eq(payoutCycles.id, id)).limit(1);
    return row ?? null;
  },

  async findByIdGlobal(id: string) {
    return withTenantContext(null, async (tx) => this.findById(tx, id));
  },

  async findOpenCycle(tx: Executor) {
    const [row] = await tx
      .select()
      .from(payoutCycles)
      .where(eq(payoutCycles.status, 'open'))
      .orderBy(desc(payoutCycles.periodStart))
      .limit(1);
    return row ?? null;
  },

  async createOpenCycle(tx: Executor, input: { periodStart: Date; periodEnd: Date; rulesSnapshot: ReferralRulesSnapshot }) {
    const [row] = await tx
      .insert(payoutCycles)
      .values({
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: 'open',
        rulesSnapshot: input.rulesSnapshot,
      })
      .returning();
    if (!row) throw new Error('Failed to create payout cycle');
    return row;
  },

  async closeCycle(
    tx: Executor,
    id: string,
    input: {
      totalPayoutMinor: number;
      tenantCapUsage: Record<
        string,
        { psfCollectedMinor: number; referralPaidMinor: number; capMinor: number }
      >;
    },
  ) {
    const [row] = await tx
      .update(payoutCycles)
      .set({
        status: 'closed' satisfies PayoutCycleStatus,
        totalPayoutMinor: input.totalPayoutMinor,
        tenantCapUsage: input.tenantCapUsage,
        closedAt: new Date(),
      })
      .where(eq(payoutCycles.id, id))
      .returning();
    return row ?? null;
  },

  async listRecent(tx: Executor, limit = 12) {
    return tx.select().from(payoutCycles).orderBy(desc(payoutCycles.periodStart)).limit(limit);
  },

  async listRecentGlobal(limit = 12) {
    return withTenantContext(null, async (tx) => this.listRecent(tx, limit));
  },
};
