import { useEffect } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useApiClient } from '@loomis/api-client';
import type { ApiClient } from '@loomis/api-client';
import { secureGet, secureSet } from './secure-store';
import { setDeviceId } from './api-client';
import { uuidv7 } from 'uuidv7';

const PUSH_REGISTERED_KEY = 'push_registered';

/** Remote push requires a dev/production build — not Expo Go (SDK 53+). */
export function isPushAvailableInCurrentBuild(): boolean {
  if (Platform.OS === 'web') return false;
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- still the Expo Go signal in SDK 56
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

async function loadNotificationsModule() {
  if (!isPushAvailableInCurrentBuild()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

async function configureNotificationHandler(): Promise<void> {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(client: ApiClient): Promise<string | null> {
  if (!isPushAvailableInCurrentBuild()) return null;

  const Notifications = await loadNotificationsModule();
  if (!Notifications) return null;

  await configureNotificationHandler();

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    // BLOCKED: EAS project ID / FCM credentials required for production push.
    return null;
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;

    let deviceId = await secureGet('device_id');
    if (!deviceId) {
      deviceId = uuidv7();
      await secureSet('device_id', deviceId);
    }
    setDeviceId(deviceId);

    await client.patch(`/devices/${deviceId}/push-token`, {
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      token,
    });

    await secureSet(PUSH_REGISTERED_KEY, '1');
    return token;
  } catch {
    // Expo Go / missing FCM — push is optional in dev.
    return null;
  }
}

export function PushRegistrationHost() {
  const client = useApiClient();

  useEffect(() => {
    if (!isPushAvailableInCurrentBuild()) return;

    void (async () => {
      const already = await secureGet(PUSH_REGISTERED_KEY);
      if (already === '1') return;
      await registerForPushNotifications(client);
    })();
  }, [client]);

  return null;
}
