import { eq } from 'drizzle-orm';
import { tiers } from '../../../../drizzle/schema/tenant.js';
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
};
