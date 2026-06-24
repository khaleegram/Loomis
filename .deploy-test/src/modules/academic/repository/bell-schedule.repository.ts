import { and, eq } from 'drizzle-orm';
import type { BellScheduleSlot } from '@loomis/contracts';
import { bellSchedules } from '../../../../drizzle/schema/academic.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

export const bellScheduleRepository = {
  async findByYear(tenantId: string, academicYearId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(bellSchedules)
        .where(
          and(eq(bellSchedules.tenantId, tenantId), eq(bellSchedules.academicYearId, academicYearId)),
        )
        .limit(1);
      return row ?? null;
    });
  },

  async upsert(
    tenantId: string,
    academicYearId: string,
    slots: BellScheduleSlot[],
    updatedById: string,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [existing] = await tx
        .select()
        .from(bellSchedules)
        .where(
          and(eq(bellSchedules.tenantId, tenantId), eq(bellSchedules.academicYearId, academicYearId)),
        )
        .limit(1);

      if (existing) {
        const [row] = await tx
          .update(bellSchedules)
          .set({ slots, updatedById, updatedAt: now })
          .where(eq(bellSchedules.id, existing.id))
          .returning();
        if (!row) throw new Error('Failed to update bell schedule');
        return row;
      }

      const [row] = await tx
        .insert(bellSchedules)
        .values({ tenantId, academicYearId, slots, updatedById })
        .returning();
      if (!row) throw new Error('Failed to create bell schedule');
      return row;
    });
  },
};
