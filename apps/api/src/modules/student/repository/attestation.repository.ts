import { and, desc, eq } from 'drizzle-orm';
import { enrollmentAttestations } from '../../../../drizzle/schema/student.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const attestationRepository = {
  async insert(
    tx: Executor,
    input: {
      tenantId: string;
      termId: string;
      systemBillableCount: number;
      generatedBy: string;
      attestedById: string | null;
      attestedAt: Date;
      studentListHash: string;
      attestationHash: string;
      rateSnapshotId: string;
      psfRateMinor: number;
    },
  ) {
    const [row] = await tx
      .insert(enrollmentAttestations)
      .values({
        tenantId: input.tenantId,
        termId: input.termId,
        systemBillableCount: input.systemBillableCount,
        generatedBy: input.generatedBy,
        attestedById: input.attestedById,
        attestedAt: input.attestedAt,
        studentListHash: input.studentListHash,
        attestationHash: input.attestationHash,
        rateSnapshotId: input.rateSnapshotId,
        psfRateMinor: input.psfRateMinor,
        attestationStatus: 'submitted',
      })
      .returning();
    if (!row) throw new Error('Failed to create enrollment attestation');
    return row;
  },

  async findByTerm(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(enrollmentAttestations)
        .where(
          and(
            eq(enrollmentAttestations.tenantId, tenantId),
            eq(enrollmentAttestations.termId, termId),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async listByTenant(tenantId: string, limit = 50) {
    return withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(enrollmentAttestations)
        .where(eq(enrollmentAttestations.tenantId, tenantId))
        .orderBy(desc(enrollmentAttestations.attestedAt))
        .limit(Math.min(limit, 200));
    });
  },
};
