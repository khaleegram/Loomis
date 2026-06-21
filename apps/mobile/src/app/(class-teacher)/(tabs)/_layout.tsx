import { Tabs } from 'expo-router';
import { OfflineBanner } from '@loomis/ui-mobile';
import { useOfflineSummaryStore } from '@/offline/offline-summary-store';

export default function ClassTeacherTabsLayout() {
  const pendingCount = useOfflineSummaryStore((s) => s.pendingCount);
  const syncing = useOfflineSummaryStore((s) => s.syncing);
  const lastSyncAt = useOfflineSummaryStore((s) => s.lastSyncAt);

  return (
    <>
      <OfflineBanner pendingCount={pendingCount} syncing={syncing} lastSyncLabel={lastSyncAt ?? undefined} />
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#8a7048' }}>
        <Tabs.Screen name="index" options={{ title: 'Class' }} />
        <Tabs.Screen name="attendance" options={{ title: 'Mark' }} />
      </Tabs>
    </>
  );
}
