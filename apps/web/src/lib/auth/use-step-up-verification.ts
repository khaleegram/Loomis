'use client';

import { useCallback, useRef, useState } from 'react';
import type { StepUpAction } from '@loomis/contracts';
import { useSendStepUpSms, useStepUpMfa } from '@loomis/api-client';
import type { StepUpTokenResult } from '@loomis/api-client';

import { resolveStepUpChannel, type StepUpChannel } from '@/lib/auth/step-up-channel';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

export interface UseStepUpVerificationConfig {
  action: StepUpAction;
  refundAmountMinor?: number;
}

/** Shared ensureStepUpToken + SMS send for census lock, refund approve, etc. */
export function useStepUpVerification(config: UseStepUpVerificationConfig) {
  const { experienceTier, flags } = useTenantExperience();
  const stepUp = useStepUpMfa();
  const sendSms = useSendStepUpSms();
  const codeRef = useRef('');
  const [smsMeta, setSmsMeta] = useState<{ maskedPhone?: string; devBypass?: boolean }>({});
  const [smsSent, setSmsSent] = useState(false);

  const channel: StepUpChannel = resolveStepUpChannel({
    action: config.action,
    experienceTier,
    flags,
    refundAmountMinor: config.refundAmountMinor,
  });

  const sendStepUpSms = useCallback(async () => {
    const result = await sendSms.mutateAsync({
      action: config.action,
      ...(config.refundAmountMinor !== undefined
        ? { refundAmountMinor: config.refundAmountMinor }
        : {}),
    });
    if (result.channel === 'sms') {
      setSmsMeta({ maskedPhone: result.maskedPhone, devBypass: result.devBypass });
      setSmsSent(true);
    }
  }, [config.action, config.refundAmountMinor, sendSms]);

  const ensureStepUpToken = useCallback(
    async (action: StepUpAction): Promise<StepUpTokenResult> => {
      if (channel === 'none') {
        return { mfaToken: '', expiresAt: new Date().toISOString() };
      }
      const code = codeRef.current;
      if (!code || code.length !== 6) {
        throw new Error(
          channel === 'sms'
            ? 'Enter the 6-digit SMS code sent to your phone.'
            : 'Enter your 6-digit authenticator code.',
        );
      }
      return stepUp.mutateAsync({
        action,
        code,
        ...(config.refundAmountMinor !== undefined
          ? { refundAmountMinor: config.refundAmountMinor }
          : {}),
      });
    },
    [channel, config.refundAmountMinor, stepUp],
  );

  return {
    channel,
    codeRef,
    ensureStepUpToken,
    sendStepUpSms,
    smsMeta,
    smsSent,
    isSmsSending: sendSms.isPending,
  };
}
