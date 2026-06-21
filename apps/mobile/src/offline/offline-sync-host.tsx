import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useApiClient } from '@loomis/api-client';
import { useAuth } from '@/lib/auth-context';
import { getDeviceId, getActiveTenantId } from '@/lib/api-client';
import { runSyncEngine, refreshOfflineSummary } from '@/offline/sync-engine';
import { useOfflineSummaryStore } from '@/offline/offline-summary-store';

export function OfflineSyncHost() {
  const client = useApiClient();
  const { session } = useAuth();
  const setPendingCount = useOfflineSummaryStore((s) => s.setPendingCount);

  useEffect(() => {
    void refreshOfflineSummary();
  }, []);

  useEffect(() => {
    if (!session) return;

    const sync = () => {
      void runSyncEngine({
        client,
        deviceId: getDeviceId() ?? 'unknown-device',
        activeTenantId: getActiveTenantId() ?? session.tenantId,
      });
    };

    sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const interval = setInterval(sync, 60_000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [client, session]);

  return null;
}
