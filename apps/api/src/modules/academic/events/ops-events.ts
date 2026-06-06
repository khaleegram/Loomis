import { outboxRepository } from '../repository/outbox.repository.js';

/**
 * Cross-module events for attendance, timetable, and assignments (US-ACA-005..007).
 *
 * These flow through the durable transactional outbox (`ledger.outbox_events`),
 * the same single delivery path the rest of Academic uses; the BullMQ relay
 * (Ledger module) drains them. Downstream consumers: Student Activity Evidence
 * (FR-SIS-007 — attendance marked, assignment submitted), Comms (attendance
 * threshold alerts, timetable publication, assignment deadline reminders), and
 * Risk (IVP enrollment-proxy signals — unique students in attendance/submissions).
 *
 * We publish standalone lifecycle events here (not part of a larger multi-table
 * write), so `publish` opens its own tenant-scoped transaction.
 */
export const ACADEMIC_OPS_EVENT_TYPES = {
  attendanceMarked: 'academic.attendance.marked',
  attendanceSynced: 'academic.attendance.synced',
  attendanceAmended: 'academic.attendance.amended',
  timetablePublished: 'academic.timetable.published',
  assignmentPublished: 'academic.assignment.published',
  assignmentSubmitted: 'academic.assignment.submitted',
} as const;

export const academicOpsEvents = {
  async publishAttendanceMarked(params: {
    tenantId: string;
    termId: string;
    classArmId: string;
    attendanceDate: string;
    session: string;
    count: number;
    markedById: string;
  }) {
    return outboxRepository.publish({
      aggregateType: 'attendance',
      aggregateId: `${params.termId}:${params.classArmId}:${params.attendanceDate}:${params.session}`,
      eventType: ACADEMIC_OPS_EVENT_TYPES.attendanceMarked,
      tenantId: params.tenantId,
      payload: { ...params },
    });
  },

  async publishAttendanceSynced(params: {
    tenantId: string;
    deviceId: string;
    count: number;
    markedById: string;
  }) {
    return outboxRepository.publish({
      aggregateType: 'attendance',
      aggregateId: params.deviceId,
      eventType: ACADEMIC_OPS_EVENT_TYPES.attendanceSynced,
      tenantId: params.tenantId,
      payload: { ...params },
    });
  },

  async publishAttendanceAmended(params: {
    tenantId: string;
    attendanceRecordId: string;
    previousStatus: string;
    newStatus: string;
    amendedById: string;
  }) {
    return outboxRepository.publish({
      aggregateType: 'attendance',
      aggregateId: params.attendanceRecordId,
      eventType: ACADEMIC_OPS_EVENT_TYPES.attendanceAmended,
      tenantId: params.tenantId,
      payload: { ...params },
    });
  },

  async publishTimetablePublished(params: {
    tenantId: string;
    termId: string;
    classArmId: string;
    count: number;
    publishedById: string;
  }) {
    return outboxRepository.publish({
      aggregateType: 'timetable',
      aggregateId: `${params.termId}:${params.classArmId}`,
      eventType: ACADEMIC_OPS_EVENT_TYPES.timetablePublished,
      tenantId: params.tenantId,
      payload: { ...params },
    });
  },

  async publishAssignmentPublished(params: {
    tenantId: string;
    assignmentId: string;
    classArmId: string;
    dueAt: string;
    publishedById: string;
  }) {
    return outboxRepository.publish({
      aggregateType: 'assignment',
      aggregateId: params.assignmentId,
      eventType: ACADEMIC_OPS_EVENT_TYPES.assignmentPublished,
      tenantId: params.tenantId,
      payload: { ...params },
    });
  },

  async publishAssignmentSubmitted(params: {
    tenantId: string;
    assignmentId: string;
    submissionId: string;
    studentId: string;
    isLate: boolean;
  }) {
    return outboxRepository.publish({
      aggregateType: 'assignment',
      aggregateId: params.submissionId,
      eventType: ACADEMIC_OPS_EVENT_TYPES.assignmentSubmitted,
      tenantId: params.tenantId,
      payload: { ...params },
    });
  },
};
