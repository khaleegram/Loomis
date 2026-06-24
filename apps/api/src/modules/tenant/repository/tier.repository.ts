import { eq, sql } from 'drizzle-orm';
import { tenants, tiers } from '../../../../drizzle/schema/tenant.js';
import { db, type Executor } from '../../../shared/db.js';

/** Tiers are platform-level reference data (not tenant-bound) — no RLS context. */
export const tierRepository = {
  async findByCode(code: string, tx?: Executor) {
    const executor = tx ?? db;
    const [tier] = await executor.select().from(tiers).where(eq(tiers.code, code)).limit(1);
    return tier ?? null;
  },

  async findById(id: string, tx?: Executor) {
    const executor = tx ?? db;
    const [tier] = await executor.select().from(tiers).where(eq(tiers.id, id)).limit(1);
    return tier ?? null;
  },

  async list(tx?: Executor) {
    const executor = tx ?? db;
    return executor.select().from(tiers).orderBy(tiers.code);
  },

  async create(
    input: {
      code: string;
      name: string;
      description: string | null;
      defaultPsfRateMinor: number;
      maxStudents: number | null;
      isSystem?: boolean;
    },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [tier] = await executor
      .insert(tiers)
      .values({
        code: input.code,
        name: input.name,
        description: input.description,
        defaultPsfRateMinor: input.defaultPsfRateMinor,
        maxStudents: input.maxStudents,
        isSystem: input.isSystem ?? false,
      })
      .returning();
    if (!tier) throw new Error('Failed to create tier');
    return tier;
  },

  async update(
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      defaultPsfRateMinor?: number;
      maxStudents?: number | null;
    },
    tx?: Executor,
  ) {
    const executor = tx ?? db;
    const [tier] = await executor
      .update(tiers)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tiers.id, id))
      .returning();
    return tier ?? null;
  },

  async countTenantsByTierId(tierId: string, tx?: Executor) {
    const executor = tx ?? db;
    const [row] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(tenants)
      .where(eq(tenants.tierId, tierId));
    return row?.count ?? 0;
  },
};
