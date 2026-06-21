export type QueueKind = 'attendance' | 'gradebook';

export type QueueStatus = 'pending_sync' | 'syncing' | 'synced' | 'conflict' | 'quarantined';

export interface QueuedMutation {
  id: string;
  kind: QueueKind;
  tenantId: string;
  payloadJson: string;
  signature: string;
  deviceId: string;
  capturedAt: string;
  status: QueueStatus;
  createdAt: string;
  errorCode?: string | null;
}

export interface AttendanceDraftPayload {
  originTenantId: string;
  termId: string;
  classArmId: string;
  studentId: string;
  attendanceDate: string;
  session: 'full_day' | 'morning' | 'afternoon';
  status: 'present' | 'absent' | 'late';
  capturedAt: string;
}

export interface GradebookDraftPayload {
  tenantId: string;
  termId: string;
  classArmId: string;
  subjectId: string;
  studentId: string;
  examConfigId: string;
  componentId: string;
  score: number;
  capturedAt: string;
}
