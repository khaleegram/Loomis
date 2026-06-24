'use client';

import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { isPushRegistered, isWebPushSupported } from '@/lib/push/web-push';
import { useWebPushRegistration } from '@/lib/push/use-web-push-registration';

const DISMISS_KEY = 'loomis_push_prompt_dismissed';

/**
 * Prompts parents to enable Web Push for same-day absence alerts (US-PAR-002).
 * In-app notifications are always created; push requires VAPID keys on the API.
 */
export function PushNotificationPrompt() {
  const { serverEnabled, isLoading, enable, syncIfNeeded } = useWebPushRegistration();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    const alreadyRegistered = isPushRegistered();
    setDismissed(wasDismissed || alreadyRegistered);
  }, []);

  useEffect(() => {
    void syncIfNeeded();
  }, [syncIfNeeded]);

  const canPrompt =
    isWebPushSupported() &&
    serverEnabled &&
    Notification.permission !== 'granted' &&
    !isPushRegistered() &&
    !dismissed &&
    !isLoading;

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
          <Button size="sm" onClick={() => void enable()}>
            Enable alerts
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
    </Alert>
  );
}
