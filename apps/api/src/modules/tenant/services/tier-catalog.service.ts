import { eq } from 'drizzle-orm';
import { PRODUCT_TIER_SPECS } from '@loomis/core';
import { tiers } from '../../../../drizzle/schema/tenant.js';
import { db } from '../../../shared/db.js';

/** Ensures Core / Advanced / Enterprise tiers exist (prod-safe, idempotent). */
export const tierCatalogService = {
  async ensureProductTiers(): Promise<void> {
    for (const spec of PRODUCT_TIER_SPECS) {
      const [existing] = await db.select().from(tiers).where(eq(tiers.code, spec.code)).limit(1);
      if (existing) {
        await db
          .update(tiers)
          .set({
            name: spec.name,
            description: spec.description,
            defaultPsfRateMinor: spec.defaultPsfRateMinor,
            maxStudents: spec.maxStudents,
            updatedAt: new Date(),
          })
          .where(eq(tiers.id, existing.id));
        continue;
      }
      await db.insert(tiers).values({
        code: spec.code,
        name: spec.name,
        description: spec.description,
        defaultPsfRateMinor: spec.defaultPsfRateMinor,
        maxStudents: spec.maxStudents,
      });
    }
  },
};
