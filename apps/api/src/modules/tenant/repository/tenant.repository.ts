import { eq } from 'drizzle-orm';
import { tenants } from '../../../../drizzle/schema/tenant.js';
import { db, type Executor } from '../../../shared/db.js';
import type { ProvisionTenantInput } from '../types.js';

/**
 * The `tenants` registry is managed by platform actors (null tenant context) and
 * is the root of tenant data, so it is not under tenant-isolation RLS itself
 * (mirrors identity.users). Tenant-bound tables in this module carry RLS.
 */
export const tenantRepository = {
  async findById(id: string, tx?: Executor) {
    const executor = tx ?? db;
    const [tenant] = await executor.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return tenant ?? null;
  },

  async findByReferralCode(referralCode: string, tx?: Executor) {
    const executor = tx ?? db;
    const [tenant] = await executor
      .select()
      .from(tenants)
      .where(eq(tenants.referralCode, referralCode))
      .limit(1);
    return tenant ?? null;
  },

  async create(
    input: ProvisionTenantInput & { tierId: string; provisionedById: string },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [tenant] = await executor
      .insert(tenants)
      .values({
        name: input.name,
        region: input.region,
        contactEmail: input.contactEmail,
        address: input.address,
        tierId: input.tierId,
        status: 'provisioning',
        referralCode: input.referralCode ?? null,
        provisionedById: input.provisionedById,
      })
      .returning();
    if (!tenant) throw new Error('Failed to create tenant');
    return tenant;
  },

  async setStatus(id: string, status: string, tx?: Executor) {
    const executor = tx ?? db;
    const [tenant] = await executor
      .update(tenants)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant ?? null;
  },

  async suspend(
    id: string,
    reason: string,
    suspendedById: string,
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [tenant] = await executor
      .update(tenants)
      .set({
        status: 'suspended',
        suspendedReason: reason,
        suspendedAt: new Date(),
        suspendedById,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();
    return tenant ?? null;
  },

  async reinstate(id: string, reinstatedById: string, tx?: Executor) {
    const executor = tx ?? db;
    const [tenant] = await executor
      .update(tenants)
      .set({
        status: 'active',
        suspendedReason: null,
        suspendedAt: null,
        suspendedById: null,
        reinstatedAt: new Date(),
        reinstatedById,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();
    return tenant ?? null;
  },
};
