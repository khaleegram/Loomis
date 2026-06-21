import '../../global.css';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from '@/lib/app-providers';
import { useAuth } from '@/lib/auth-context';
import { OfflineSyncHost } from '@/offline/offline-sync-host';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  return (
    <>
      <OfflineSyncHost />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(class-teacher)" />
        <Stack.Screen name="(teacher)" />
        {__DEV__ ? <Stack.Screen name="(dev)/showcase" /> : null}
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
