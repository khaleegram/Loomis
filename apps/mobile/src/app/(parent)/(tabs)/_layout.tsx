import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useOfflineSummaryStore } from '@/offline/offline-summary-store';
import { OfflineBanner } from '@loomis/ui-mobile';
import { ParentFloatingTabBar, type FloatingTabBarProps } from '@/components/parent/chrome/parent-floating-tab-bar';

export default function ParentTabsLayout() {
  const pendingCount = useOfflineSummaryStore((s) => s.pendingCount);
  const syncing = useOfflineSummaryStore((s) => s.syncing);
  const lastSyncAt = useOfflineSummaryStore((s) => s.lastSyncAt);

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="dark" />
      <OfflineBanner
        pendingCount={pendingCount}
        syncing={syncing}
        lastSyncLabel={lastSyncAt ? `Last sync ${new Date(lastSyncAt).toLocaleTimeString()}` : undefined}
      />
      <Tabs
        tabBar={(props) => (
          <ParentFloatingTabBar
            state={props.state}
            navigation={props.navigation as unknown as FloatingTabBarProps['navigation']}
          />
        )}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          sceneStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="academics" options={{ title: 'Academics' }} />
        <Tabs.Screen name="fees" options={{ title: 'Fees' }} />
        <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      </Tabs>
    </View>
  );
}
