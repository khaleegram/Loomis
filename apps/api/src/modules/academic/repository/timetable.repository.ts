import { and, asc, eq, gt, lt, ne, sql } from 'drizzle-orm';
import { classArms, classLevels, timetables } from '../../../../drizzle/schema/academic.js';
import { staffProfiles } from '../../../../drizzle/schema/hrm.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

interface CreateTimetableEntryInput {
  termId: string;
  classArmId: string;
  subjectId: string;
  teacherStaffProfileId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
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
   * existing.end > new.start. The service inspects these for teacher/class clashes
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
            ne(timetables.status, 'marked_for_removal'),
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

  async list(tenantId: string, termId: string, classArmId: string, publishedOnly = false) {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [
        eq(timetables.tenantId, tenantId),
        eq(timetables.termId, termId),
        eq(timetables.classArmId, classArmId),
        ne(timetables.status, 'marked_for_removal'),
      ];
      if (publishedOnly) {
        conditions.push(eq(timetables.status, 'published'));
      }

      return tx
        .select({
          id: timetables.id,
          tenantId: timetables.tenantId,
          termId: timetables.termId,
          classArmId: timetables.classArmId,
          subjectId: timetables.subjectId,
          teacherStaffProfileId: timetables.teacherStaffProfileId,
          teacherName: staffProfiles.fullName,
          dayOfWeek: timetables.dayOfWeek,
          startMinute: timetables.startMinute,
          endMinute: timetables.endMinute,
          status: timetables.status,
          createdById: timetables.createdById,
          createdAt: timetables.createdAt,
          updatedAt: timetables.updatedAt,
        })
        .from(timetables)
        .leftJoin(staffProfiles, eq(staffProfiles.id, timetables.teacherStaffProfileId))
        .where(and(...conditions))
        .orderBy(asc(timetables.dayOfWeek), asc(timetables.startMinute));
    });
  },

  async publishTerm(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();

      await tx
        .delete(timetables)
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.termId, termId),
            eq(timetables.status, 'marked_for_removal'),
          ),
        );

      return tx
        .update(timetables)
        .set({ status: 'published', updatedAt: now })
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.termId, termId),
            eq(timetables.status, 'draft'),
          ),
        )
        .returning();
    });
  },

  async markForRemoval(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(timetables)
        .set({ status: 'marked_for_removal', updatedAt: now })
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.id, id),
            eq(timetables.status, 'published'),
          ),
        )
        .returning();
      return row ?? null;
    });
  },

  async listPendingForTerm(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select({
          id: timetables.id,
          tenantId: timetables.tenantId,
          termId: timetables.termId,
          classArmId: timetables.classArmId,
          subjectId: timetables.subjectId,
          teacherStaffProfileId: timetables.teacherStaffProfileId,
          teacherName: staffProfiles.fullName,
          dayOfWeek: timetables.dayOfWeek,
          startMinute: timetables.startMinute,
          endMinute: timetables.endMinute,
          status: timetables.status,
          createdById: timetables.createdById,
          createdAt: timetables.createdAt,
          updatedAt: timetables.updatedAt,
        })
        .from(timetables)
        .leftJoin(staffProfiles, eq(staffProfiles.id, timetables.teacherStaffProfileId))
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.termId, termId),
            sql`${timetables.status} IN ('draft', 'marked_for_removal')`,
          ),
        )
        .orderBy(asc(timetables.classArmId), asc(timetables.dayOfWeek), asc(timetables.startMinute)),
    );
  },

  /** @deprecated Use publishTerm — publishes all draft slots for the term. */
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

  async listByTeacherForTerm(
    tenantId: string,
    termId: string,
    teacherStaffProfileId: string,
  ) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select({
          id: timetables.id,
          tenantId: timetables.tenantId,
          termId: timetables.termId,
          classArmId: timetables.classArmId,
          subjectId: timetables.subjectId,
          teacherStaffProfileId: timetables.teacherStaffProfileId,
          teacherName: staffProfiles.fullName,
          classLevelCode: classLevels.code,
          classArmName: classArms.name,
          dayOfWeek: timetables.dayOfWeek,
          startMinute: timetables.startMinute,
          endMinute: timetables.endMinute,
          status: timetables.status,
          createdById: timetables.createdById,
          createdAt: timetables.createdAt,
          updatedAt: timetables.updatedAt,
        })
        .from(timetables)
        .leftJoin(staffProfiles, eq(staffProfiles.id, timetables.teacherStaffProfileId))
        .innerJoin(classArms, eq(classArms.id, timetables.classArmId))
        .innerJoin(classLevels, eq(classLevels.id, classArms.classLevelId))
        .where(
          and(
            eq(timetables.tenantId, tenantId),
            eq(timetables.termId, termId),
            eq(timetables.teacherStaffProfileId, teacherStaffProfileId),
            eq(timetables.status, 'published'),
          ),
        )
        .orderBy(asc(timetables.dayOfWeek), asc(timetables.startMinute)),
    );
  },

  async countByClassArmForTerm(tenantId: string, termId: string) {
    return withTenantContext(tenantId, async (tx) =>
      tx
        .select({
          classArmId: timetables.classArmId,
          lessonCount: sql<number>`count(*)::int`,
          draftCount: sql<number>`count(*) filter (where ${timetables.status} = 'draft')::int`,
          pendingRemovalCount: sql<number>`count(*) filter (where ${timetables.status} = 'marked_for_removal')::int`,
          publishedCount: sql<number>`count(*) filter (where ${timetables.status} = 'published')::int`,
        })
        .from(timetables)
        .where(and(eq(timetables.tenantId, tenantId), eq(timetables.termId, termId)))
        .groupBy(timetables.classArmId),
    );
  },
};
