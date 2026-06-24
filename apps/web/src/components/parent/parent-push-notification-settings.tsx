'use client';

import { Button, cn } from '@loomis/ui-web';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { SmartHint } from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useWebPushRegistration } from '@/lib/push/use-web-push-registration';

interface ParentPushNotificationSettingsProps {
  className?: string;
  compact?: boolean;
}

export function ParentPushNotificationSettings({
  className,
  compact = false,
}: ParentPushNotificationSettingsProps) {
  const { status, error, serverEnabled, isLoading, enable, syncIfNeeded } =
    useWebPushRegistration();

  useEffect(() => {
    void syncIfNeeded();
  }, [syncIfNeeded]);

  const statusCopy: Record<string, string> = {
    unsupported:
      'This browser does not support web push. Use Chrome/Edge on desktop or Android, or install the Loomis app.',
    server_disabled:
      'Push alerts are not turned on for this environment yet. In-app messages still work under Messages.',
    blocked:
      'Notifications are blocked in your browser. Open site settings for loomis.digital and allow notifications.',
    prompt: 'Get a phone-style alert when your child is marked absent the same day.',
    syncing: 'Connecting this browser to Loomis alerts…',
    enabled: 'This browser will receive absence and payment alerts.',
    error: error ?? 'Could not enable push on this device.',
  };

  const isEnabled = status === 'enabled';
  const canEnable =
    serverEnabled && (status === 'prompt' || status === 'error') && !isLoading;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'flex gap-3 rounded-xl border px-4 py-3',
          isEnabled
            ? 'border-emerald-200/80 bg-emerald-50/50'
            : 'border-neutral-200/80 bg-white',
        )}
      >
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-700',
          )}
        >
          {status === 'syncing' ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : isEnabled ? (
            <Bell className="size-4" aria-hidden />
          ) : (
            <BellOff className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-neutral-900">
            {isEnabled ? 'Browser alerts on' : 'Browser alerts'}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-600">
            {statusCopy[status] ?? statusCopy.prompt}
          </p>
        </div>
        {canEnable ? (
          <Button
            type="button"
            size="sm"
            className={cn(!compact && ACADEMIC_UI.btnPrimary, 'shrink-0 self-center')}
            onClick={() => void enable()}
          >
            Enable
          </Button>
        ) : null}
      </div>
      <SmartHint>
        Works in the browser on HTTPS — no app install required on desktop/Android. iPhone needs
        Add to Home Screen first. Toggling checkboxes here does not register push; use Enable above.
      </SmartHint>
    </div>
  );
}
