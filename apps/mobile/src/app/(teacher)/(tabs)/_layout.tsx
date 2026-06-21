import { Tabs } from 'expo-router';
import { OfflineBanner } from '@loomis/ui-mobile';
import { useOfflineSummaryStore } from '@/offline/offline-summary-store';

export default function TeacherTabsLayout() {
  const pendingCount = useOfflineSummaryStore((s) => s.pendingCount);
  const syncing = useOfflineSummaryStore((s) => s.syncing);

  return (
    <>
      <OfflineBanner pendingCount={pendingCount} syncing={syncing} />
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#8a7048' }}>
        <Tabs.Screen name="index" options={{ title: 'Subjects' }} />
        <Tabs.Screen name="gradebook" options={{ title: 'Grades' }} />
      </Tabs>
    </>
  );
}
