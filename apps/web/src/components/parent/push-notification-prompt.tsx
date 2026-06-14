'use client';

import { useRegisterPushSubscription, useRegisterWebDevice, useWebPushConfig } from '@loomis/api-client';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import { Bell, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  getOrCreateDeviceFingerprint,
  getStoredWebDeviceId,
  isPushRegistered,
  isWebPushSupported,
  markPushRegistered,
  serializePushSubscription,
  storeWebDeviceId,
  subscribeToWebPush,
} from '@/lib/push/web-push';

const DISMISS_KEY = 'loomis_push_prompt_dismissed';

/**
 * Prompts parents to enable Web Push for same-day absence alerts (US-PAR-002).
 * In-app notifications are always created; push requires VAPID keys on the API.
 */
export function PushNotificationPrompt() {
  const configQuery = useWebPushConfig();
  const registerDevice = useRegisterWebDevice();
  const registerPush = useRegisterPushSubscription();
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    const alreadyRegistered = isPushRegistered();
    const permissionGranted = Notification.permission === 'granted';
    setDismissed(wasDismissed || alreadyRegistered || permissionGranted);
  }, []);

  const canPrompt =
    isWebPushSupported() &&
    configQuery.data?.webPushEnabled &&
    configQuery.data.vapidPublicKey &&
    Notification.permission !== 'granted' &&
    !isPushRegistered() &&
    !dismissed;

  const enablePush = useCallback(async () => {
    const vapidPublicKey = configQuery.data?.vapidPublicKey;
    if (!vapidPublicKey) return;

    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission was not granted.');
        return;
      }

      let deviceId = getStoredWebDeviceId();
      if (!deviceId) {
        const fingerprint = getOrCreateDeviceFingerprint();
        const registered = await registerDevice.mutateAsync({ deviceFingerprint: fingerprint });
        deviceId = registered.deviceId;
        storeWebDeviceId(deviceId);
      }

      const subscription = await subscribeToWebPush(vapidPublicKey);
      await registerPush.mutateAsync({
        deviceId,
        platform: 'web',
        token: serializePushSubscription(subscription),
      });

      markPushRegistered();
      setDismissed(true);
    } catch {
      setError('Could not enable push notifications. Try again from your browser settings.');
    } finally {
      setBusy(false);
    }
  }, [configQuery.data?.vapidPublicKey, registerDevice, registerPush]);

  if (!canPrompt) return null;

  return (
    <Alert className="mx-4 mb-4 border-brand-200 bg-brand-50/80 sm:mx-6 lg:mx-12">
      <Bell className="size-4 text-brand-700" />
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AlertDescription className="text-[13px] text-neutral-700">
          Get notified when your child is marked absent. Enable browser notifications for same-day
          alerts.
        </AlertDescription>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" disabled={busy} onClick={() => void enablePush()}>
            {busy ? 'Enabling…' : 'Enable alerts'}
          </Button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Dismiss"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, '1');
              setDismissed(true);
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-[12px] text-red-600">{error}</p> : null}
    </Alert>
  );
}
