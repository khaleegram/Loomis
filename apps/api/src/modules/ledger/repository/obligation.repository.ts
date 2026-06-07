import { and, eq, sql } from 'drizzle-orm';
import { psfObligations, psfSettlements } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { CreatePsfObligationInput } from '../types.js';

export const obligationRepository = {
  async create(tx: Executor, input: CreatePsfObligationInput) {
    const [row] = await tx
      .insert(psfObligations)
      .values({
        tenantId: input.tenantId,
        termId: input.termId,
        studentId: input.studentId,
        rateSnapshotId: input.rateSnapshotId,
        amountMinor: input.amountMinor,
        status: 'pending',
        liabilityReason: input.liabilityReason,
      })
      .returning();
    if (!row) throw new Error('Failed to create PSF obligation');
    return row;
  },

  async findByStudentTermForUpdate(tx: Executor, tenantId: string, studentId: string, termId: string) {
    const [row] = await tx
      .select()
      .from(psfObligations)
      .where(
        and(
          eq(psfObligations.tenantId, tenantId),
          eq(psfObligations.studentId, studentId),
          eq(psfObligations.termId, termId),
        ),
      )
      .for('update')
      .limit(1);
    return row ?? null;
  },

  async findByStudentTerm(tenantId: string, studentId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(psfObligations)
        .where(
          and(
            eq(psfObligations.tenantId, tenantId),
            eq(psfObligations.studentId, studentId),
            eq(psfObligations.termId, termId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async countUnsettledForTerm(tenantId: string, termId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(psfObligations)
        .where(
          and(
            eq(psfObligations.tenantId, tenantId),
            eq(psfObligations.termId, termId),
            sql`(
              SELECT coalesce(sum(${psfSettlements.settlementAmountMinor}), 0)
              FROM ${psfSettlements}
              WHERE ${psfSettlements.psfObligationId} = ${psfObligations.id}
                AND ${psfSettlements.settlementStatus} = 'VERIFIED'
            ) < ${psfObligations.amountMinor}`,
          ),
        );
      return Number(row?.total ?? 0);
    });
  },

  async sumAllObligationAmounts(): Promise<number> {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<number>`coalesce(sum(${psfObligations.amountMinor}), 0)::bigint`,
        })
        .from(psfObligations);
      return Number(row?.total ?? 0);
    });
  },

  async sumObligationAmountsForTerm(tenantId: string, termId: string): Promise<number> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<number>`coalesce(sum(${psfObligations.amountMinor}), 0)::bigint`,
        })
        .from(psfObligations)
        .where(and(eq(psfObligations.tenantId, tenantId), eq(psfObligations.termId, termId)));
      return Number(row?.total ?? 0);
    });
  },
};
