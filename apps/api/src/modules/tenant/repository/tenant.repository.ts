import { and, desc, eq } from 'drizzle-orm';
import { tenants } from '../../../../drizzle/schema/tenant.js';
import { db, type Executor } from '../../../shared/db.js';
import type { ProvisionTenantInput } from '../types.js';

/**
 * The `tenants` registry is managed by platform actors (null tenant context) and
 * is the root of tenant data, so it is not under tenant-isolation RLS itself
 * (mirrors identity.users). Tenant-bound tables in this module carry RLS.
 */
export const tenantRepository = {
  async listAll(tx?: Executor) {
    const executor = tx ?? db;
    return executor.select().from(tenants).orderBy(desc(tenants.createdAt));
  },

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
    input: ProvisionTenantInput & {
      tierId: string;
      provisionedById: string;
    },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const now = new Date();
    const [tenant] = await executor
      .insert(tenants)
      .values({
        name: input.name,
        region: input.region,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        address: input.address,
        tierId: input.tierId,
        status: 'active',
        activatedAt: now,
        referralCode: input.referralCode ?? null,
        provisionedById: input.provisionedById,
        goLiveAt: now,
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

  async activate(id: string, activatedAt: Date, tx?: Executor) {
    const executor = tx ?? db;
    const [tenant] = await executor
      .update(tenants)
      .set({
        status: 'active',
        activatedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(tenants.id, id), eq(tenants.status, 'provisioning')))
      .returning();
    return tenant ?? null;
  },

  async updateTierId(id: string, tierId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [tenant] = await executor
      .update(tenants)
      .set({ tierId, updatedAt: new Date() })
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

  async updateProfile(
    id: string,
    patch: {
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      region?: string;
    },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const updates: {
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      region?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (patch.contactEmail !== undefined) updates.contactEmail = patch.contactEmail;
    if (patch.contactPhone !== undefined) updates.contactPhone = patch.contactPhone;
    if (patch.address !== undefined) updates.address = patch.address;
    if (patch.region !== undefined) updates.region = patch.region;

    const [tenant] = await executor
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, id))
      .returning();
    return tenant ?? null;
  },

  async updateExperience(
    id: string,
    patch: {
      experienceTier?: string;
      financeMode?: string;
      experienceFlags?: Record<string, boolean>;
    },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const updates: {
      experienceTier?: string;
      financeMode?: string;
      experienceFlags?: Record<string, boolean>;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (patch.experienceTier !== undefined) updates.experienceTier = patch.experienceTier;
    if (patch.financeMode !== undefined) updates.financeMode = patch.financeMode;
    if (patch.experienceFlags !== undefined) updates.experienceFlags = patch.experienceFlags;

    const [tenant] = await executor
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, id))
      .returning();
    return tenant ?? null;
  },
};
