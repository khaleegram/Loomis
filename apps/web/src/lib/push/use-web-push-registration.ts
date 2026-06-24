'use client';

import {
  useRegisterPushSubscription,
  useRegisterWebDevice,
  useWebPushConfig,
} from '@loomis/api-client';
import { useCallback, useEffect, useState } from 'react';

import {
  clearPushRegistered,
  getOrCreateDeviceFingerprint,
  getStoredWebDeviceId,
  isPushRegistered,
  isWebPushSupported,
  markPushRegistered,
  serializePushSubscription,
  storeWebDeviceId,
  subscribeToWebPush,
} from '@/lib/push/web-push';

export type WebPushStatus =
  | 'unsupported'
  | 'server_disabled'
  | 'blocked'
  | 'prompt'
  | 'syncing'
  | 'enabled'
  | 'error';

export function useWebPushRegistration() {
  const configQuery = useWebPushConfig();
  const registerDevice = useRegisterWebDevice();
  const registerPush = useRegisterPushSubscription();
  const [status, setStatus] = useState<WebPushStatus>('prompt');
  const [error, setError] = useState<string | null>(null);

  const serverEnabled = Boolean(
    configQuery.data?.webPushEnabled && configQuery.data.vapidPublicKey,
  );
  const vapidPublicKey = configQuery.data?.vapidPublicKey ?? null;

  const refreshStatus = useCallback(() => {
    if (!isWebPushSupported()) {
      setStatus('unsupported');
      return;
    }
    if (configQuery.isLoading) return;
    if (!serverEnabled) {
      setStatus('server_disabled');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('blocked');
      return;
    }
    if (isPushRegistered() && Notification.permission === 'granted') {
      setStatus('enabled');
      return;
    }
    setStatus('prompt');
  }, [configQuery.isLoading, serverEnabled]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const registerWithApi = useCallback(async () => {
    if (!vapidPublicKey) {
      throw new Error('Push is not configured on the server yet.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Browser notification permission was denied.');
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
  }, [registerDevice, registerPush, vapidPublicKey]);

  const enable = useCallback(async () => {
    setError(null);
    setStatus('syncing');
    try {
      await registerWithApi();
      setStatus('enabled');
    } catch (err) {
      clearPushRegistered();
      setStatus(Notification.permission === 'denied' ? 'blocked' : 'error');
      setError(
        err instanceof Error
          ? err.message
          : 'Could not enable push notifications. Check browser settings and try again.',
      );
    }
  }, [registerWithApi]);

  /** Re-register when permission is already granted but API subscription is missing. */
  const syncIfNeeded = useCallback(async () => {
    if (!serverEnabled || !isWebPushSupported()) return;
    if (Notification.permission !== 'granted') return;
    if (isPushRegistered()) {
      setStatus('enabled');
      return;
    }
    setStatus('syncing');
    setError(null);
    try {
      await registerWithApi();
      setStatus('enabled');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not sync push subscription.');
    }
  }, [registerWithApi, serverEnabled]);

  return {
    status,
    error,
    serverEnabled,
    isLoading: configQuery.isLoading,
    enable,
    syncIfNeeded,
    refreshStatus,
  };
}
