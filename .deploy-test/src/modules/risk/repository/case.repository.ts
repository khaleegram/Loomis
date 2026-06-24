import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { academicTerms } from '../../../../drizzle/schema/academic.js';
import { ivpAnomalyCases } from '../../../../drizzle/schema/risk.js';
import { tenants } from '../../../../drizzle/schema/tenant.js';
import type { Executor } from '../../../shared/db.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { IvpCaseStatus } from '@loomis/contracts';
import { ACTIVE_IVP_STATUSES } from '../types.js';

export const caseRepository = {
  async create(
    tx: Executor,
    input: {
      tenantId: string;
      termId: string;
      reportedEnrollment: number;
      estimatedMin: number;
      estimatedMax: number;
      anomalyScore: number;
      priority: string;
      signalsAnalyzed: Record<string, unknown>;
    },
  ) {
    const [row] = await tx
      .insert(ivpAnomalyCases)
      .values({
        tenantId: input.tenantId,
        termId: input.termId,
        reportedEnrollment: input.reportedEnrollment,
        estimatedMin: input.estimatedMin,
        estimatedMax: input.estimatedMax,
        anomalyScore: input.anomalyScore,
        priority: input.priority,
        signalsAnalyzed: input.signalsAnalyzed,
        caseStatus: 'OPEN',
      })
      .returning();
    if (!row) throw new Error('Failed to create IVP anomaly case');
    return row;
  },

  async findById(tenantId: string | null, caseId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(ivpAnomalyCases)
        .where(eq(ivpAnomalyCases.id, caseId))
        .limit(1);
      return row ?? null;
    });
  },

  async listForTenant(tenantId: string, status?: IvpCaseStatus) {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [eq(ivpAnomalyCases.tenantId, tenantId)];
      if (status) conditions.push(eq(ivpAnomalyCases.caseStatus, status));
      return tx
        .select()
        .from(ivpAnomalyCases)
        .where(and(...conditions))
        .orderBy(desc(ivpAnomalyCases.detectedAt));
    });
  },

  async listPlatform(status?: IvpCaseStatus) {
    return withTenantContext(null, async (tx) => {
      const conditions = status ? [eq(ivpAnomalyCases.caseStatus, status)] : [];
      return tx
        .select()
        .from(ivpAnomalyCases)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ivpAnomalyCases.anomalyScore));
    });
  },

  async hasActiveCase(tenantId: string): Promise<boolean> {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select({ id: ivpAnomalyCases.id })
        .from(ivpAnomalyCases)
        .where(
          and(
            eq(ivpAnomalyCases.tenantId, tenantId),
            inArray(ivpAnomalyCases.caseStatus, ACTIVE_IVP_STATUSES),
          ),
        )
        .limit(1);
      return Boolean(row);
    });
  },

  async hasActiveCaseForTerm(tenantId: string, termId: string): Promise<boolean> {
    return withTenantContext(tenantId, async (tx) =>
      this.hasActiveCaseForTermInTx(tx, tenantId, termId),
    );
  },

  async hasActiveCaseForTermInTx(tx: Executor, tenantId: string, termId: string): Promise<boolean> {
    const [row] = await tx
      .select({ id: ivpAnomalyCases.id })
      .from(ivpAnomalyCases)
      .where(
        and(
          eq(ivpAnomalyCases.tenantId, tenantId),
          eq(ivpAnomalyCases.termId, termId),
          inArray(ivpAnomalyCases.caseStatus, ACTIVE_IVP_STATUSES),
        ),
      )
      .limit(1);
    return Boolean(row);
  },

  async update(
    tenantId: string,
    caseId: string,
    patch: {
      caseStatus?: IvpCaseStatus;
      assignedToId?: string | null;
      resolutionNotes?: string | null;
      resolvedById?: string | null;
      resolvedAt?: Date | null;
    },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .update(ivpAnomalyCases)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(ivpAnomalyCases.tenantId, tenantId), eq(ivpAnomalyCases.id, caseId)))
        .returning();
      return row ?? null;
    });
  },

  async listCensusLockedTermsForBatch() {
    return withTenantContext(null, async (tx) =>
      tx
        .select({
          tenantId: academicTerms.tenantId,
          termId: academicTerms.id,
          reportedEnrollment: academicTerms.declaredBillableCount,
        })
        .from(academicTerms)
        .innerJoin(tenants, eq(tenants.id, academicTerms.tenantId))
        .where(
          and(
            eq(academicTerms.status, 'census_locked'),
            eq(tenants.status, 'active'),
            sql`${academicTerms.declaredBillableCount} IS NOT NULL`,
          ),
        ),
    );
  },
};
