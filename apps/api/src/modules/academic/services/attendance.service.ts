import type {
  AmendAttendanceRequest,
  MarkAttendanceRequest,
  SyncOfflineAttendanceRequest,
} from '@loomis/contracts';
import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { academicOpsEvents } from '../events/ops-events.js';
import { academicRepository } from '../repository/academic.repository.js';
import { attendanceRepository } from '../repository/attendance.repository.js';
import { deviceKeyRepository } from '../repository/device-key.repository.js';
import type { ActorContext } from '../types.js';
import { actorCanActAsClassTeacher } from './actor-roles.js';
import { verifyAttendanceSignature } from './device-signature.js';
import { requireTenant, requireTerm } from './_shared.js';

/** How many days of offline backlog a device may sync (ASM-010: 7-day retention). */
const OFFLINE_SYNC_MAX_AGE_DAYS = 7;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoUtc(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Attendance business rules (SRS §4.5 FR-ACA-002; CON-003; US-ACA-005).
 *
 * CON-003 is enforced in TWO layers: the route uses requireStaffRole('class_teacher')
 * so regular Teachers are blocked at the middleware, and every method here
 * re-asserts the role AND that the actor is the *active Class Teacher of that
 * class arm for that term* (defense in depth — never trust the role claim alone).
 */
export const attendanceService = {
  /**
   * Online batch mark of the class list for one date/session. The term must be
   * open and the date must be today.
   */
  async markAttendance(
    tenantId: string,
    input: MarkAttendanceRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, input.termId);
    assertTermOpen(term.status);
    await assertClassArm(tenantId, input.classArmId);
    const profile = await resolveActiveClassTeacher(
      tenantId,
      input.termId,
      input.classArmId,
      actor,
    );

    if (input.attendanceDate !== todayUtc()) {
      throw new LoomisError(
        'ACADEMIC_ATTENDANCE_DATE_INVALID',
        422,
        'Attendance can only be marked online for the current day',
      );
    }

    const records = await attendanceRepository.markBatch(
      tenantId,
      {
        termId: input.termId,
        classArmId: input.classArmId,
        attendanceDate: input.attendanceDate,
        session: input.session,
        markedByStaffProfileId: profile.id,
        markedByUserId: actor.userId,
      },
      input.entries,
    );

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.attendance.marked',
      resourceType: 'attendance',
      resourceId: input.classArmId,
      sensitivity: 'child_pii',
      result: 'success',
      requestId,
      metadata: {
        termId: input.termId,
        classArmId: input.classArmId,
        attendanceDate: input.attendanceDate,
        session: input.session,
        count: records.length,
      },
    });

    const absentStudentIds = records
      .filter((record) => record.status === 'absent')
      .map((record) => record.studentId);

    await academicOpsEvents.publishAttendanceMarked({
      tenantId,
      termId: input.termId,
      classArmId: input.classArmId,
      attendanceDate: input.attendanceDate,
      session: input.session,
      count: records.length,
      absentStudentIds,
      markedById: actor.userId,
    });

    return records;
  },

  /**
   * Offline sync (MOB-007). Verifies the WHOLE batch before applying any of it:
   * every entry's origin tenant must match the authenticated tenant, every
   * signature must verify against the registered device key, and the actor must
   * be the active Class Teacher of each entry's class arm. Any failure rejects
   * the entire batch — it is never partially applied.
   */
  async syncOfflineAttendance(
    tenantId: string,
    input: SyncOfflineAttendanceRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    if (!(await actorCanActAsClassTeacher(actor))) {
      throw new LoomisError(
        'ACADEMIC_ATTENDANCE_FORBIDDEN_ROLE',
        403,
        'Only a Class Teacher may sync attendance (CON-003)',
      );
    }

    // 1) Origin tenant must match for EVERY entry (reject wholesale on mismatch).
    for (const entry of input.entries) {
      if (entry.originTenantId !== tenantId) {
        throw new LoomisError(
          'ACADEMIC_ATTENDANCE_TENANT_MISMATCH',
          403,
          'An offline entry originates from a different tenant; the batch was rejected',
        );
      }
    }

    // 2) The device must have an active registered signing key.
    const deviceKey = await deviceKeyRepository.findActiveByDeviceId(tenantId, input.deviceId);
    if (!deviceKey) {
      throw new LoomisError(
        'ACADEMIC_ATTENDANCE_DEVICE_KEY_NOT_FOUND',
        404,
        'No active signing key is registered for this device',
      );
    }

    // 3) Every signature must verify (reject wholesale on any failure).
    for (const entry of input.entries) {
      if (!verifyAttendanceSignature(entry, deviceKey.publicKeyPem)) {
        throw new LoomisError(
          'ACADEMIC_ATTENDANCE_SIGNATURE_INVALID',
          422,
          'An offline entry has an invalid signature; the batch was rejected',
        );
      }
    }

    // 4) Date window + term-open + class-teacher scope for every entry.
    const earliest = daysAgoUtc(OFFLINE_SYNC_MAX_AGE_DAYS);
    const today = todayUtc();
    const profile = await resolveStaffProfile(tenantId, actor);
    const termStatusCache = new Map<string, string>();
    const armScopeCache = new Set<string>();

    for (const entry of input.entries) {
      if (entry.attendanceDate < earliest || entry.attendanceDate > today) {
        throw new LoomisError(
          'ACADEMIC_ATTENDANCE_DATE_INVALID',
          422,
          'An offline entry is outside the allowed sync window; the batch was rejected',
        );
      }

      let status = termStatusCache.get(entry.termId);
      if (status === undefined) {
        const term = await requireTerm(tenantId, entry.termId);
        status = term.status;
        termStatusCache.set(entry.termId, status);
      }
      assertTermOpen(status);

      const scopeKey = `${entry.termId}:${entry.classArmId}`;
      if (!armScopeCache.has(scopeKey)) {
        await assertActiveClassTeacherForArm(tenantId, entry.termId, entry.classArmId, profile.id);
        armScopeCache.add(scopeKey);
      }
    }

    // 5) Apply the verified batch atomically.
    const rows = input.entries.map((entry) => ({
      termId: entry.termId,
      classArmId: entry.classArmId,
      studentId: entry.studentId,
      attendanceDate: entry.attendanceDate,
      session: entry.session,
      status: entry.status,
      deviceId: input.deviceId,
      capturedAt: new Date(entry.capturedAt),
      markedByStaffProfileId: profile.id,
      markedByUserId: actor.userId,
    }));
    const records = await attendanceRepository.applyOfflineBatch(tenantId, rows);

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.attendance.synced',
      resourceType: 'attendance',
      resourceId: input.deviceId,
      sensitivity: 'child_pii',
      result: 'success',
      requestId,
      metadata: { deviceId: input.deviceId, count: records.length },
    });

    await academicOpsEvents.publishAttendanceSynced({
      tenantId,
      deviceId: input.deviceId,
      count: records.length,
      markedById: actor.userId,
    });

    return records;
  },

  /** Same-day amendment of a single record (US-ACA-005). The change is logged. */
  async amendAttendance(
    tenantId: string,
    recordId: string,
    input: AmendAttendanceRequest,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    const record = await attendanceRepository.findById(tenantId, recordId);
    if (!record) {
      throw new LoomisError('ACADEMIC_ATTENDANCE_NOT_FOUND', 404, 'Attendance record not found');
    }
    await resolveActiveClassTeacher(tenantId, record.termId, record.classArmId, actor);

    if (record.attendanceDate !== todayUtc()) {
      throw new LoomisError(
        'ACADEMIC_ATTENDANCE_AMENDMENT_WINDOW_CLOSED',
        422,
        'Attendance can only be amended on the same day it was recorded (US-ACA-005)',
      );
    }

    const previousStatus = record.status;
    const updated = await attendanceRepository.amend(tenantId, recordId, {
      status: input.status,
      reason: input.reason,
      previousStatus,
      amendedByUserId: actor.userId,
    });
    if (!updated) {
      throw new LoomisError('ACADEMIC_ATTENDANCE_NOT_FOUND', 404, 'Attendance record not found');
    }

    await writeAudit({
      tenantId,
      actorUserId: actor.userId,
      action: 'academic.attendance.amended',
      resourceType: 'attendance',
      resourceId: recordId,
      sensitivity: 'child_pii',
      result: 'success',
      requestId,
      metadata: { previousStatus, newStatus: input.status, reason: input.reason },
    });

    await academicOpsEvents.publishAttendanceAmended({
      tenantId,
      attendanceRecordId: recordId,
      studentId: record.studentId,
      attendanceDate: record.attendanceDate,
      session: record.session,
      previousStatus,
      newStatus: input.status,
      amendedById: actor.userId,
    });

    return updated;
  },

  async listAttendance(
    tenantId: string,
    filter: {
      termId: string;
      classArmId: string;
      attendanceDate?: string | undefined;
      studentId?: string | undefined;
    },
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    return attendanceRepository.list(tenantId, filter);
  },

  async listStudentAttendance(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    if (actor.role !== 'student') {
      throw new LoomisError('FORBIDDEN', 403, 'Student role required');
    }

    const student = await studentRepository.findStudentByUserId(tenantId, actor.userId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student profile not found');
    }

    return this.listChildAttendance(tenantId, student.id, termId, actor);
  },

  /** Term attendance for a student — school oversight roles (US-SIS / attendance.view). */
  async listStudentAttendanceForStaff(
    tenantId: string,
    studentId: string,
    termId: string,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    const oversightRoles = new Set(['school_owner', 'principal', 'admin_officer']);
    if (!oversightRoles.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'You do not have permission to view student attendance');
    }

    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }

    return this.listChildAttendance(tenantId, studentId, termId, actor);
  },

  async listParentChildAttendance(
    tenantId: string,
    studentId: string,
    termId: string,
    actor: ActorContext,
  ) {
    if (actor.role !== 'parent') {
      throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
    }

    const linked = await studentRepository.hasActiveParentLink(tenantId, actor.userId, studentId);
    if (!linked) {
      throw new LoomisError('FORBIDDEN', 403, 'You are not linked to this student');
    }

    return this.listChildAttendance(tenantId, studentId, termId, actor);
  },

  async listChildAttendance(
    tenantId: string,
    studentId: string,
    termId: string,
    _actor: ActorContext,
  ) {
    const enrollment = await studentRepository.findEnrollmentForTerm(tenantId, studentId, termId);
    if (
      !enrollment ||
      !['active', 'active_billable', 'suspended'].includes(enrollment.status)
    ) {
      throw new LoomisError('STUDENT_ENROLLMENT_NOT_FOUND', 404, 'No active enrollment for this term');
    }

    const records = await attendanceRepository.list(tenantId, {
      termId,
      classArmId: enrollment.classArmId,
      studentId,
    });

    const summary = summarizeAttendance(records);
    const classArm = await academicRepository.findClassArmById(tenantId, enrollment.classArmId);
    const level = classArm
      ? await academicRepository.findClassLevelById(tenantId, classArm.classLevelId)
      : null;

    return {
      records,
      summary,
      classArmLabel: classArm && level ? `${level.code} ${classArm.name}` : null,
    };
  },
};

function assertTermOpen(status: string): void {
  if (status !== 'open') {
    throw new LoomisError(
      'ACADEMIC_TERM_NOT_OPEN',
      409,
      'Attendance can only be marked while the term is open',
    );
  }
}

async function assertClassArm(tenantId: string, classArmId: string): Promise<void> {
  const arm = await academicRepository.findClassArmById(tenantId, classArmId);
  if (!arm) {
    throw new LoomisError('ACADEMIC_CLASS_ARM_NOT_FOUND', 404, 'Class arm not found');
  }
}

async function resolveStaffProfile(tenantId: string, actor: ActorContext) {
  const profile = await staffRepository.findProfileByUserId(tenantId, actor.userId);
  if (!profile) {
    throw new LoomisError(
      'ACADEMIC_ATTENDANCE_NOT_ASSIGNED',
      403,
      'No staff profile is linked to this account',
    );
  }
  return profile;
}

async function assertActiveClassTeacherForArm(
  tenantId: string,
  termId: string,
  classArmId: string,
  staffProfileId: string,
): Promise<void> {
  const assignment = await staffRepository.findActiveClassTeacherForArm(tenantId, termId, classArmId);
  if (!assignment || assignment.staffProfileId !== staffProfileId) {
    throw new LoomisError(
      'ACADEMIC_ATTENDANCE_NOT_ASSIGNED',
      403,
      'You are not the active Class Teacher for this class arm this term (CON-003)',
    );
  }
}

/**
 * The single gate that enforces CON-003 in the service layer: the actor must be a
 * Class Teacher AND the active Class Teacher of the given arm/term.
 */
async function resolveActiveClassTeacher(
  tenantId: string,
  termId: string,
  classArmId: string,
  actor: ActorContext,
) {
  if (!(await actorCanActAsClassTeacher(actor))) {
    throw new LoomisError(
      'ACADEMIC_ATTENDANCE_FORBIDDEN_ROLE',
      403,
      'Only a Class Teacher may mark or amend attendance (CON-003)',
    );
  }
  const profile = await resolveStaffProfile(tenantId, actor);
  await assertActiveClassTeacherForArm(tenantId, termId, classArmId, profile.id);
  return profile;
}

function summarizeAttendance(
  records: Array<{ status: string }>,
): { present: number; absent: number; late: number; excused: number } {
  const summary = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const record of records) {
    if (record.status === 'present') summary.present += 1;
    if (record.status === 'absent') summary.absent += 1;
    if (record.status === 'late') summary.late += 1;
    if (record.status === 'excused') summary.excused += 1;
  }
  return summary;
}
