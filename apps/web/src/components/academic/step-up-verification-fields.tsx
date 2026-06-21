'use client';

import {
  Alert,
  AlertDescription,
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@loomis/ui-web';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';

import type { StepUpChannel } from '@/lib/auth/step-up-channel';

interface StepUpVerificationFieldsProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  channel: StepUpChannel;
  maskedPhone?: string | null;
  devBypass?: boolean;
  onSendSms?: () => Promise<void>;
  smsSent?: boolean;
}

/** Inline step-up field — SMS (Core) or authenticator (Advanced+). */
export function StepUpVerificationFields<T extends FieldValues>({
  control,
  name,
  channel,
  maskedPhone,
  devBypass,
  onSendSms,
  smsSent = false,
}: StepUpVerificationFieldsProps<T>) {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (channel === 'none') {
    return null;
  }

  const isSms = channel === 'sms';

  const handleSend = async () => {
    if (!onSendSms) return;
    setSendError(null);
    setSending(true);
    try {
      await onSendSms();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send SMS code');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <Alert variant="warning">
        <AlertDescription>
          {isSms ? (
            <>
              Step-up verification is required. We will send a 6-digit code
              {maskedPhone ? ` to ${maskedPhone}` : ' to your phone on file'}.
              {devBypass ? ' In development without Termii, use code 000000.' : null}
            </>
          ) : (
            <>Step-up verification is required. Enter the 6-digit code from your authenticator app.</>
          )}
        </AlertDescription>
      </Alert>

      {isSms && onSendSms ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={sending} onClick={() => void handleSend()}>
            {sending ? (
              <>
                <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                Sending…
              </>
            ) : smsSent ? (
              'Resend SMS code'
            ) : (
              'Send SMS code'
            )}
          </Button>
          {smsSent ? (
            <span className="text-xs text-neutral-500">Code sent — check your phone.</span>
          ) : null}
        </div>
      ) : null}

      {sendError ? (
        <Alert variant="destructive">
          <AlertDescription>{sendError}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{isSms ? 'SMS code' : 'Authenticator code'}</FormLabel>
            <FormControl>
              <Input
                {...field}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="font-mono tracking-widest"
                onChange={(e) => {
                  field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
