import { and, desc, eq } from 'drizzle-orm';
import { psfAdjustmentRequests } from '../../../../drizzle/schema/ledger.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { db } from '../../../shared/db.js';

export const adjustmentRepository = {
  async create(
    tenantId: string,
    input: {
      termId: string;
      requestedById: string;
      reason: string;
      deltaType: 'add_students' | 'remove_students';
      studentIds: string[];
    },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .insert(psfAdjustmentRequests)
        .values({
          tenantId,
          termId: input.termId,
          requestedById: input.requestedById,
          reason: input.reason,
          deltaType: input.deltaType,
          studentIds: input.studentIds,
          status: 'pending',
        })
        .returning();
      if (!row) throw new Error('Failed to create PSF adjustment request');
      return row;
    });
  },

  async listForTerm(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(psfAdjustmentRequests)
        .where(
          and(
            eq(psfAdjustmentRequests.tenantId, tenantId),
            eq(psfAdjustmentRequests.termId, termId),
          ),
        )
        .orderBy(desc(psfAdjustmentRequests.createdAt)),
    );
  },

  async findById(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(psfAdjustmentRequests)
        .where(
          and(eq(psfAdjustmentRequests.tenantId, tenantId), eq(psfAdjustmentRequests.id, id)),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async findByIdGlobal(id: string) {
    const [row] = await db
      .select()
      .from(psfAdjustmentRequests)
      .where(eq(psfAdjustmentRequests.id, id))
      .limit(1);
    return row ?? null;
  },

  async listPendingGlobal() {
    return db
      .select()
      .from(psfAdjustmentRequests)
      .where(eq(psfAdjustmentRequests.status, 'pending'))
      .orderBy(desc(psfAdjustmentRequests.createdAt));
  },

  async updateStatusInTx(
    tx: Executor,
    id: string,
    input: {
      status: 'approved' | 'rejected';
      reviewedById: string;
      reviewedAt: Date;
      rejectionReason?: string | null;
    },
  ) {
    const [row] = await tx
      .update(psfAdjustmentRequests)
      .set({
        status: input.status,
        reviewedById: input.reviewedById,
        reviewedAt: input.reviewedAt,
        rejectionReason: input.rejectionReason ?? null,
        updatedAt: input.reviewedAt,
      })
      .where(and(eq(psfAdjustmentRequests.id, id), eq(psfAdjustmentRequests.status, 'pending')))
      .returning();
    return row ?? null;
  },
};
