import { and, eq, inArray, sql } from 'drizzle-orm';
import { earningEntries } from '../../../../drizzle/schema/referral.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { EarningStatus, EarningType } from '@loomis/contracts';

export const earningRepository = {
  async create(
    tx: Executor,
    input: {
      participantId: string;
      tenantId: string;
      attributionId: string;
      psfObligationId: string;
      payoutCycleId: string;
      earningType: EarningType;
      amountMinor: number;
      psfSettledAmountMinor: number;
      rateBasisPoints: number;
      status: EarningStatus;
      holdReason?: string | null;
      idempotencyKey: string;
    },
  ) {
    const [row] = await tx
      .insert(earningEntries)
      .values({
        participantId: input.participantId,
        tenantId: input.tenantId,
        attributionId: input.attributionId,
        psfObligationId: input.psfObligationId,
        payoutCycleId: input.payoutCycleId,
        earningType: input.earningType,
        amountMinor: input.amountMinor,
        psfSettledAmountMinor: input.psfSettledAmountMinor,
        rateBasisPoints: input.rateBasisPoints,
        status: input.status,
        holdReason: input.holdReason ?? null,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  },

  async findByIdempotencyKey(tx: Executor, key: string) {
    const [row] = await tx
      .select()
      .from(earningEntries)
      .where(eq(earningEntries.idempotencyKey, key))
      .limit(1);
    return row ?? null;
  },

  async listForParticipant(tx: Executor, participantId: string, payoutCycleId?: string) {
    const conditions = [eq(earningEntries.participantId, participantId)];
    if (payoutCycleId) conditions.push(eq(earningEntries.payoutCycleId, payoutCycleId));
    return tx
      .select()
      .from(earningEntries)
      .where(and(...conditions))
      .orderBy(earningEntries.createdAt);
  },

  async listForParticipantGlobal(participantId: string, payoutCycleId?: string) {
    return withTenantContext(null, async (tx) =>
      this.listForParticipant(tx, participantId, payoutCycleId),
    );
  },

  async sumByTenantAndCycle(
    tx: Executor,
    tenantId: string,
    payoutCycleId: string,
    statuses: EarningStatus[],
  ): Promise<{ amountMinor: number; psfCollectedMinor: number }> {
    const [row] = await tx
      .select({
        amountMinor: sql<number>`coalesce(sum(${earningEntries.amountMinor}), 0)::bigint`,
        psfCollectedMinor: sql<number>`coalesce(sum(distinct ${earningEntries.psfSettledAmountMinor}), 0)::bigint`,
      })
      .from(earningEntries)
      .where(
        and(
          eq(earningEntries.tenantId, tenantId),
          eq(earningEntries.payoutCycleId, payoutCycleId),
          inArray(earningEntries.status, statuses),
        ),
      );
    return {
      amountMinor: Number(row?.amountMinor ?? 0),
      psfCollectedMinor: Number(row?.psfCollectedMinor ?? 0),
    };
  },

  async sumPsfCollectedForTenantCycle(
    tx: Executor,
    tenantId: string,
    payoutCycleId: string,
  ): Promise<number> {
    const [row] = await tx
      .select({
        total: sql<number>`coalesce(sum(${earningEntries.psfSettledAmountMinor}), 0)::bigint`,
      })
      .from(earningEntries)
      .where(
        and(
          eq(earningEntries.tenantId, tenantId),
          eq(earningEntries.payoutCycleId, payoutCycleId),
        ),
      );
    return Number(row?.total ?? 0);
  },

  async listByCycleAndTenant(tx: Executor, payoutCycleId: string, tenantId: string) {
    return tx
      .select()
      .from(earningEntries)
      .where(
        and(
          eq(earningEntries.payoutCycleId, payoutCycleId),
          eq(earningEntries.tenantId, tenantId),
        ),
      )
      .orderBy(earningEntries.createdAt);
  },

  async updateStatusByTenant(
    tx: Executor,
    tenantId: string,
    fromStatuses: EarningStatus[],
    toStatus: EarningStatus,
    holdReason?: string | null,
  ) {
    return tx
      .update(earningEntries)
      .set({ status: toStatus, holdReason: holdReason ?? null })
      .where(and(eq(earningEntries.tenantId, tenantId), inArray(earningEntries.status, fromStatuses)))
      .returning();
  },

  async updateStatuses(
    tx: Executor,
    ids: string[],
    status: EarningStatus,
    holdReason?: string | null,
  ) {
    if (ids.length === 0) return [];
    return tx
      .update(earningEntries)
      .set({ status, holdReason: holdReason ?? null })
      .where(inArray(earningEntries.id, ids))
      .returning();
  },

  async listHeldForTenant(tx: Executor, tenantId: string) {
    return tx
      .select()
      .from(earningEntries)
      .where(and(eq(earningEntries.tenantId, tenantId), eq(earningEntries.status, 'held')));
  },
};
