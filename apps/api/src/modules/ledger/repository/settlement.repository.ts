import { and, eq, sql } from 'drizzle-orm';
import { psfObligations, psfSettlements } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { CreatePsfSettlementInput } from '../types.js';

export const settlementRepository = {
  async create(tx: Executor, input: CreatePsfSettlementInput) {
    const [row] = await tx
      .insert(psfSettlements)
      .values({
        tenantId: input.tenantId,
        psfObligationId: input.psfObligationId,
        paymentId: input.paymentId,
        settlementAmountMinor: input.settlementAmountMinor,
        settlementSource: input.settlementSource,
        settlementStatus: 'VERIFIED',
        verifiedBy: input.verifiedBy,
        verifiedAt: input.verifiedAt,
        idempotencyKey: input.idempotencyKey,
      })
      .returning();
    if (!row) throw new Error('Failed to create PSF settlement');
    return row;
  },

  async findByIdempotencyKey(tx: Executor, idempotencyKey: string) {
    const [row] = await tx
      .select()
      .from(psfSettlements)
      .where(eq(psfSettlements.idempotencyKey, idempotencyKey))
      .limit(1);
    return row ?? null;
  },

  async sumVerifiedForObligation(tx: Executor, obligationId: string): Promise<number> {
    const [row] = await tx
      .select({
        total: sql<number>`coalesce(sum(${psfSettlements.settlementAmountMinor}), 0)::bigint`,
      })
      .from(psfSettlements)
      .where(
        and(
          eq(psfSettlements.psfObligationId, obligationId),
          eq(psfSettlements.settlementStatus, 'VERIFIED'),
        ),
      );
    return Number(row?.total ?? 0);
  },

  async sumVerifiedSettlementsForTerm(tenantId: string, termId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<number>`coalesce(sum(${psfSettlements.settlementAmountMinor}), 0)::bigint`,
        })
        .from(psfSettlements)
        .innerJoin(psfObligations, eq(psfSettlements.psfObligationId, psfObligations.id))
        .where(
          and(
            eq(psfSettlements.tenantId, tenantId),
            eq(psfObligations.termId, termId),
            eq(psfSettlements.settlementStatus, 'VERIFIED'),
          ),
        );
      return Number(row?.total ?? 0);
    });
  },
};
