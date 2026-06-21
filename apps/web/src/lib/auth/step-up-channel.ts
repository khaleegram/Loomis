import type { StepUpAction } from '@loomis/contracts';
import {
  isCoreTier,
  refundApproveRequiresStepUp,
  stepUpUsesSms,
  type ResolvedExperienceFlags,
} from '@loomis/core';
import type { ExperienceTier } from '@loomis/contracts';

export type StepUpChannel = 'sms' | 'totp' | 'none';

/** Resolves whether a step-up form is needed and which channel to show. */
export function resolveStepUpChannel(input: {
  action: StepUpAction;
  experienceTier: ExperienceTier;
  flags: ResolvedExperienceFlags;
  refundAmountMinor?: number;
}): StepUpChannel {
  if (input.action === 'refund_approve') {
    const amount = input.refundAmountMinor ?? 0;
    if (!refundApproveRequiresStepUp(input.experienceTier, input.flags, amount)) {
      return 'none';
    }
  }

  if (
    stepUpUsesSms(input.action, input.experienceTier, input.flags, {
      refundAmountMinor: input.refundAmountMinor,
    })
  ) {
    return 'sms';
  }

  return 'totp';
}

export function stepUpChannelLabel(channel: StepUpChannel): string {
  if (channel === 'sms') return 'SMS code';
  if (channel === 'totp') return 'authenticator code';
  return '';
}

export function isCoreTierExperience(tier: ExperienceTier): boolean {
  return isCoreTier(tier);
}
