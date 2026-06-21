import type { OfflineAttendanceEntry } from '@loomis/contracts';

export function buildAttendanceSigningMessage(entry: Omit<OfflineAttendanceEntry, 'signature'>): string {
  return [
    'loomis.attendance.v1',
    entry.originTenantId,
    entry.termId,
    entry.classArmId,
    entry.studentId,
    entry.attendanceDate,
    entry.session,
    entry.status,
    entry.capturedAt,
  ].join('|');
}
