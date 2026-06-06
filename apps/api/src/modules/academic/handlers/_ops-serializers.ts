import type {
  AssignmentResponse,
  AssignmentStatus,
  AttendanceRecordResponse,
  AttendanceSession,
  AttendanceSource,
  AttendanceStatus,
  DeviceKeyResponse,
  SubmissionResponse,
  SubmissionStatus,
  TimetableEntryResponse,
  TimetableEntryStatus,
} from '@loomis/contracts';
import type {
  assignments,
  attendanceDeviceKeys,
  attendanceRecords,
  submissions,
  timetables,
} from '../../../../drizzle/schema/academic.js';

type AttendanceRow = typeof attendanceRecords.$inferSelect;
type DeviceKeyRow = typeof attendanceDeviceKeys.$inferSelect;
type TimetableRow = typeof timetables.$inferSelect;
type AssignmentRow = typeof assignments.$inferSelect;
type SubmissionRow = typeof submissions.$inferSelect;

export function attendanceRecordToResponse(row: AttendanceRow): AttendanceRecordResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    classArmId: row.classArmId,
    studentId: row.studentId,
    attendanceDate: row.attendanceDate,
    session: row.session as AttendanceSession,
    status: row.status as AttendanceStatus,
    source: row.source as AttendanceSource,
    deviceId: row.deviceId ?? null,
    signatureVerified: row.signatureVerified,
    markedByStaffProfileId: row.markedByStaffProfileId,
    capturedAt: row.capturedAt?.toISOString() ?? null,
    syncedAt: row.syncedAt?.toISOString() ?? null,
    amendedAt: row.amendedAt?.toISOString() ?? null,
    previousStatus: (row.previousStatus as AttendanceStatus | null) ?? null,
    amendmentReason: row.amendmentReason ?? null,
    amendmentCount: row.amendmentCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function deviceKeyToResponse(row: DeviceKeyRow): DeviceKeyResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    deviceId: row.deviceId,
    label: row.label ?? null,
    revoked: row.revoked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function timetableEntryToResponse(row: TimetableRow): TimetableEntryResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    classArmId: row.classArmId,
    subjectId: row.subjectId,
    teacherStaffProfileId: row.teacherStaffProfileId,
    dayOfWeek: row.dayOfWeek,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    venue: row.venue ?? null,
    status: row.status as TimetableEntryStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function assignmentToResponse(row: AssignmentRow): AssignmentResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    classArmId: row.classArmId,
    subjectId: row.subjectId,
    teacherStaffProfileId: row.teacherStaffProfileId,
    title: row.title,
    instructions: row.instructions,
    dueAt: row.dueAt.toISOString(),
    maxScore: row.maxScore,
    status: row.status as AssignmentStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function submissionToResponse(row: SubmissionRow): SubmissionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    assignmentId: row.assignmentId,
    studentId: row.studentId,
    content: row.content ?? null,
    storageObjectId: row.storageObjectId ?? null,
    status: row.status as SubmissionStatus,
    isLate: row.isLate,
    submittedAt: row.submittedAt.toISOString(),
    score: row.score ?? null,
    feedback: row.feedback ?? null,
    gradedByStaffProfileId: row.gradedByStaffProfileId ?? null,
    gradedAt: row.gradedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
