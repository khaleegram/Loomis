import { and, asc, eq, sql } from 'drizzle-orm';
import { attendanceRecords } from '../../../../drizzle/schema/academic.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

interface MarkBatchContext {
  termId: string;
  classArmId: string;
  attendanceDate: string;
  session: string;
  markedByStaffProfileId: string;
  markedByUserId: string;
}

interface OfflineRow {
  termId: string;
  classArmId: string;
  studentId: string;
  attendanceDate: string;
  session: string;
  status: string;
  deviceId: string;
  capturedAt: Date;
  markedByStaffProfileId: string;
  markedByUserId: string;
}

/**
 * Attendance persistence (FR-ACA-002 / US-ACA-005). All writes go through a
 * single tenant-scoped transaction so an offline sync batch is applied
 * atomically — never partially (MOB-007).
 */
export const attendanceRepository = {
  /**
   * Online batch mark. Upserts one record per student for a (term, class, date,
   * session). Re-marking the same day overwrites the prior status (the dedicated
   * amend endpoint is used for logged, reasoned changes).
   */
  async markBatch(
    tenantId: string,
    ctx: MarkBatchContext,
    entries: Array<{ studentId: string; status: string }>,
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const rows = entries.map((e) => ({
        tenantId,
        termId: ctx.termId,
        classArmId: ctx.classArmId,
        studentId: e.studentId,
        attendanceDate: ctx.attendanceDate,
        session: ctx.session,
        status: e.status,
        source: 'online',
        signatureVerified: false,
        markedByStaffProfileId: ctx.markedByStaffProfileId,
        markedByUserId: ctx.markedByUserId,
      }));
      return tx
        .insert(attendanceRecords)
        .values(rows)
        .onConflictDoUpdate({
          target: [
            attendanceRecords.tenantId,
            attendanceRecords.termId,
            attendanceRecords.classArmId,
            attendanceRecords.studentId,
            attendanceRecords.attendanceDate,
            attendanceRecords.session,
          ],
          set: {
            status: sql`excluded.status`,
            source: sql`excluded.source`,
            markedByStaffProfileId: sql`excluded.marked_by_staff_profile_id`,
            markedByUserId: sql`excluded.marked_by_user_id`,
            updatedAt: new Date(),
          },
        })
        .returning();
    });
  },

  /**
   * Offline sync apply. Inserts the verified, signed entries in one transaction.
   * Records the device provenance and marks them signature-verified.
   */
  async applyOfflineBatch(tenantId: string, rows: OfflineRow[]) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const values = rows.map((r) => ({
        tenantId,
        termId: r.termId,
        classArmId: r.classArmId,
        studentId: r.studentId,
        attendanceDate: r.attendanceDate,
        session: r.session,
        status: r.status,
        source: 'offline_sync',
        deviceId: r.deviceId,
        signatureVerified: true,
        markedByStaffProfileId: r.markedByStaffProfileId,
        markedByUserId: r.markedByUserId,
        capturedAt: r.capturedAt,
        syncedAt: now,
      }));
      return tx
        .insert(attendanceRecords)
        .values(values)
        .onConflictDoUpdate({
          target: [
            attendanceRecords.tenantId,
            attendanceRecords.termId,
            attendanceRecords.classArmId,
            attendanceRecords.studentId,
            attendanceRecords.attendanceDate,
            attendanceRecords.session,
          ],
          set: {
            status: sql`excluded.status`,
            source: sql`excluded.source`,
            deviceId: sql`excluded.device_id`,
            signatureVerified: sql`excluded.signature_verified`,
            capturedAt: sql`excluded.captured_at`,
            syncedAt: sql`excluded.synced_at`,
            updatedAt: now,
          },
        })
        .returning();
    });
  },

  async findById(tenantId: string, id: string) {
    return withTenantContext(tenantId, async (tx) => {
      const [record] = await tx
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.tenantId, tenantId), eq(attendanceRecords.id, id)))
        .limit(1);
      return record ?? null;
    });
  },

  /** Same-day amendment (US-ACA-005). Records the prior status and bumps the count. */
  async amend(
    tenantId: string,
    id: string,
    input: { status: string; reason: string; previousStatus: string; amendedByUserId: string },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const now = new Date();
      const [record] = await tx
        .update(attendanceRecords)
        .set({
          status: input.status,
          previousStatus: input.previousStatus,
          amendmentReason: input.reason,
          amendedByUserId: input.amendedByUserId,
          amendedAt: now,
          amendmentCount: sql`${attendanceRecords.amendmentCount} + 1`,
          updatedAt: now,
        })
        .where(and(eq(attendanceRecords.tenantId, tenantId), eq(attendanceRecords.id, id)))
        .returning();
      return record ?? null;
    });
  },

  async list(
    tenantId: string,
    filter: {
      termId: string;
      classArmId: string;
      attendanceDate?: string | undefined;
      studentId?: string | undefined;
    },
  ) {
    return withTenantContext(tenantId, async (tx) => {
      const conditions = [
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.termId, filter.termId),
        eq(attendanceRecords.classArmId, filter.classArmId),
      ];
      if (filter.attendanceDate) {
        conditions.push(eq(attendanceRecords.attendanceDate, filter.attendanceDate));
      }
      if (filter.studentId) {
        conditions.push(eq(attendanceRecords.studentId, filter.studentId));
      }
      return tx
        .select()
        .from(attendanceRecords)
        .where(and(...conditions))
        .orderBy(asc(attendanceRecords.attendanceDate), asc(attendanceRecords.studentId));
    });
  },
};
