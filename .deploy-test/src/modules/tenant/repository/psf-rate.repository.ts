import { and, desc, eq, isNull } from 'drizzle-orm';
import { psfRateSnapshots } from '../../../../drizzle/schema/tenant.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import type { CreatePsfRateSnapshotInput } from '../types.js';

/**
 * PSF rate snapshots are immutable and append-only (System Design §3.2). This
 * repository only ever INSERTs or SELECTs — never UPDATE/DELETE. The DB enforces
 * immutability with a trigger and CON-011 (rate > 0) with a CHECK constraint.
 *
 * RLS allows global rows (tenant_id IS NULL) plus rows matching the current
 * tenant context, so per-tenant operations set the tenant context to the target
 * tenant; global operations run with a null context.
 */
export const psfRateSnapshotRepository = {
  async create(input: CreatePsfRateSnapshotInput) {
    const contextTenantId = input.scope === 'tenant' ? input.tenantId : null;
    return withTenantContext(contextTenantId, async (tx) => {
      const [snapshot] = await tx
        .insert(psfRateSnapshots)
        .values({
          scope: input.scope,
          tenantId: input.tenantId,
          rateMinor: input.rateMinor,
          previousRateMinor: input.previousRateMinor,
          effectiveFrom: input.effectiveFrom,
          reason: input.reason,
          changedById: input.changedById,
          approvedById: input.approvedById ?? null,
          workflowInstanceId: input.workflowInstanceId ?? null,
        })
        .returning();
      if (!snapshot) throw new Error('Failed to create PSF rate snapshot');
      return snapshot;
    });
  },

  /** Latest global default PSF rate snapshot, or null if none set yet. */
  async findLatestGlobal() {
    return withTenantContext(null, async (tx) => {
      const [snapshot] = await tx
        .select()
        .from(psfRateSnapshots)
        .where(eq(psfRateSnapshots.scope, 'global'))
        .orderBy(desc(psfRateSnapshots.createdAt))
        .limit(1);
      return snapshot ?? null;
    });
  },

  /** Latest per-tenant override snapshot for a tenant, or null. */
  async findLatestForTenant(tenantId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [snapshot] = await tx
        .select()
        .from(psfRateSnapshots)
        .where(
          and(eq(psfRateSnapshots.scope, 'tenant'), eq(psfRateSnapshots.tenantId, tenantId)),
        )
        .orderBy(desc(psfRateSnapshots.createdAt))
        .limit(1);
      return snapshot ?? null;
    });
  },

  async listGlobalHistory() {
    return withTenantContext(null, async (tx) => {
      return tx
        .select()
        .from(psfRateSnapshots)
        .where(eq(psfRateSnapshots.scope, 'global'))
        .orderBy(desc(psfRateSnapshots.createdAt));
    });
  },

  async listTenantHistory(tenantId: string) {
    return withTenantContext(tenantId, async (tx) => {
      return tx
        .select()
        .from(psfRateSnapshots)
        .where(
          and(eq(psfRateSnapshots.scope, 'tenant'), eq(psfRateSnapshots.tenantId, tenantId)),
        )
        .orderBy(desc(psfRateSnapshots.createdAt));
    });
  },

  /** Convenience for global default lookups expressed via tenant_id IS NULL. */
  async existsGlobal() {
    return withTenantContext(null, async (tx) => {
      const [row] = await tx
        .select({ id: psfRateSnapshots.id })
        .from(psfRateSnapshots)
        .where(isNull(psfRateSnapshots.tenantId))
        .limit(1);
      return Boolean(row);
    });
  },
};
