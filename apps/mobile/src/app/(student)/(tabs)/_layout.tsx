import { Tabs } from 'expo-router';
import { OfflineBanner } from '@loomis/ui-mobile';
import { useOfflineSummaryStore } from '@/offline/offline-summary-store';

export default function StudentTabsLayout() {
  const pendingCount = useOfflineSummaryStore((s) => s.pendingCount);
  const syncing = useOfflineSummaryStore((s) => s.syncing);
  const lastSyncAt = useOfflineSummaryStore((s) => s.lastSyncAt);

  return (
    <>
      <OfflineBanner
        pendingCount={pendingCount}
        syncing={syncing}
        lastSyncLabel={lastSyncAt ? `Last sync ${new Date(lastSyncAt).toLocaleTimeString()}` : undefined}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#8a7048',
          tabBarInactiveTintColor: '#94a3b8',
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="timetable" options={{ title: 'Schedule' }} />
        <Tabs.Screen name="academics" options={{ title: 'Academics' }} />
        <Tabs.Screen name="assignments" options={{ title: 'Assignments' }} />
      </Tabs>
    </>
  );
}
