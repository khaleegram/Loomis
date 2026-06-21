import * as Network from 'expo-network';
import type { ApiClient } from '@loomis/api-client';
import type { OfflineAttendanceEntry, SyncOfflineAttendanceRequest } from '@loomis/contracts';
import {
  countPendingQueueItems,
  deleteSyncedOlderThan,
  listPendingQueueItems,
  listStalePendingItems,
  updateQueueStatus,
} from './db.js';
import { getDevicePublicKeyPem } from './crypto.js';
import { useOfflineSummaryStore } from './offline-summary-store.js';
import type { QueuedMutation } from './types.js';

const STALE_DAYS = 7;

export interface SyncEngineOptions {
  client: ApiClient;
  deviceId: string;
  activeTenantId: string | null;
  onStaleItems?: (items: QueuedMutation[]) => void;
}

export async function refreshOfflineSummary(): Promise<void> {
  const count = await countPendingQueueItems();
  useOfflineSummaryStore.getState().setPendingCount(count);
}

export async function runSyncEngine(options: SyncEngineOptions): Promise<void> {
  const { client, deviceId, activeTenantId, onStaleItems } = options;
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected) return;

  const stale = await listStalePendingItems(STALE_DAYS);
  if (stale.length > 0) {
    onStaleItems?.(stale);
  }

  const pending = await listPendingQueueItems();
  if (pending.length === 0) {
    await deleteSyncedOlderThan(STALE_DAYS);
    return;
  }

  useOfflineSummaryStore.getState().setSyncing(true);

  try {
    const attendanceItems = pending.filter((item) => item.kind === 'attendance');
    if (attendanceItems.length > 0 && activeTenantId) {
      await syncAttendanceBatch(client, deviceId, activeTenantId, attendanceItems);
    }

    for (const item of pending.filter((i) => i.kind === 'gradebook')) {
      await updateQueueStatus(item.id, 'synced');
    }

    useOfflineSummaryStore.getState().setLastSyncAt(new Date().toISOString());
    await refreshOfflineSummary();
    await deleteSyncedOlderThan(STALE_DAYS);
  } finally {
    useOfflineSummaryStore.getState().setSyncing(false);
  }
}

async function syncAttendanceBatch(
  client: ApiClient,
  deviceId: string,
  tenantId: string,
  items: QueuedMutation[],
): Promise<void> {
  const tenantMismatch = items.some((item) => item.tenantId !== tenantId);
  if (tenantMismatch) {
    for (const item of items) {
      await updateQueueStatus(item.id, 'quarantined', 'TENANT_MISMATCH');
    }
    return;
  }

  try {
    await client.post(`/tenants/${tenantId}/attendance/device-keys`, {
      deviceId,
      publicKeyPem: await getDevicePublicKeyPem(tenantId),
    });
  } catch {
    // key may already exist
  }

  const entries: OfflineAttendanceEntry[] = items.map((item) => {
    const parsed = JSON.parse(item.payloadJson) as OfflineAttendanceEntry;
    return parsed;
  });

  const body: SyncOfflineAttendanceRequest = { deviceId, entries };

  try {
    await client.post(`/tenants/${tenantId}/attendance/sync`, body);
    for (const item of items) {
      await updateQueueStatus(item.id, 'synced');
    }
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : 'SYNC_FAILED';
    for (const item of items) {
      await updateQueueStatus(item.id, code.includes('SIGNATURE') ? 'quarantined' : 'conflict', code);
    }
  }
}
