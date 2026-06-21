import { uuidv7 } from 'uuidv7';
import { insertQueueItem, countPendingQueueItems } from './db.js';
import { signAttendanceEntry } from './crypto.js';
import { useOfflineSummaryStore } from './offline-summary-store.js';
import type { AttendanceDraftPayload, GradebookDraftPayload, QueueKind } from './types.js';

async function refreshSummary(): Promise<void> {
  const count = await countPendingQueueItems();
  useOfflineSummaryStore.getState().setPendingCount(count);
}

export async function enqueueAttendanceDraft(
  deviceId: string,
  draft: AttendanceDraftPayload,
): Promise<string> {
  const id = uuidv7();
  const capturedAt = draft.capturedAt;
  const entry = {
    originTenantId: draft.originTenantId,
    termId: draft.termId,
    classArmId: draft.classArmId,
    studentId: draft.studentId,
    attendanceDate: draft.attendanceDate,
    session: draft.session,
    status: draft.status,
    capturedAt,
  };
  const signature = await signAttendanceEntry(draft.originTenantId, entry);

  await insertQueueItem({
    id,
    kind: 'attendance',
    tenantId: draft.originTenantId,
    payloadJson: JSON.stringify({ ...entry, signature }),
    signature,
    deviceId,
    capturedAt,
    status: 'pending_sync',
    createdAt: new Date().toISOString(),
  });
  await refreshSummary();
  return id;
}

export async function enqueueGradebookDraft(
  deviceId: string,
  draft: GradebookDraftPayload,
): Promise<string> {
  const id = uuidv7();
  const capturedAt = draft.capturedAt;
  await insertQueueItem({
    id,
    kind: 'gradebook',
    tenantId: draft.tenantId,
    payloadJson: JSON.stringify(draft),
    signature: '',
    deviceId,
    capturedAt,
    status: 'pending_sync',
    createdAt: new Date().toISOString(),
  });
  await refreshSummary();
  return id;
}

export async function enqueueMutation(
  kind: QueueKind,
  deviceId: string,
  tenantId: string,
  payload: AttendanceDraftPayload | GradebookDraftPayload,
): Promise<string> {
  if (kind === 'attendance') {
    return enqueueAttendanceDraft(deviceId, payload as AttendanceDraftPayload);
  }
  return enqueueGradebookDraft(deviceId, payload as GradebookDraftPayload);
}
