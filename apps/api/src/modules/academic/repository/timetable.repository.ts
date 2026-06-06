import { and, asc, eq, gt, lt } from 'drizzle-orm';
import { timetables } from '../../../../drizzle/schema/academic.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

interface CreateTimetableEntryInput {
  termId: string;
  classArmId: string;
  subjectId: string;
  teacherStaffProfileId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  venue: string | null;
}

/** Timetable persistence and the overlap query that powers conflict detection. */
export const timetableRepository = {
  async create(tenantId: string, input: CreateTimetableEntryInput, createdById: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .insert(timetables)
        .values({ tenantId, ...input, createdById })
        .returning();
      if (!row) throw new Error('Failed to create timetable entry');
      return row;
    });
  },

  /**
   * All entries for a term on a given weekday whose time window overlaps the
   * candidate [startMinute, endMinute). Overlap = existing.start < new.end AND
   * existing.end > new.start. The service inspects these for teacher/class/venue
   * clashes (US-ACA-006).
   */
  async findOverlapping(
    tenantId: string,
    termId: string,
    dayOfWeek: number,
    startMinute: number,
    endMinute: number,
  ) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(timetables)
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.termId, termId),
            eq(timetables.dayOfWeek, dayOfWeek),
            lt(timetables.startMinute, endMinute),
            gt(timetables.endMinute, startMinute),
          ),
        ),
    );
  },

  async findById(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(timetables)
        .where(and(eq(timetables.tenantId, tenantId), eq(timetables.id, id)))
        .limit(1);
      return row ?? null;
    });
  },

  async list(tenantId: string, termId: string, classArmId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select()
        .from(timetables)
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.termId, termId),
            eq(timetables.classArmId, classArmId),
          ),
        )
        .orderBy(asc(timetables.dayOfWeek), asc(timetables.startMinute)),
    );
  },

  async publish(tenantId: string, termId: string, classArmId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      return tx
        .update(timetables)
        .set({ status: 'published', updatedAt: now })
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.termId, termId),
            eq(timetables.classArmId, classArmId),
          ),
        )
        .returning();
    });
  },

  async deleteById(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [row] = await tx
        .delete(timetables)
        .where(and(eq(timetables.tenantId, tenantId), eq(timetables.id, id)))
        .returning();
      return row ?? null;
    });
  },
};
