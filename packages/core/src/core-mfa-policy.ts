import type { ExperienceTier, Role, StepUpAction } from '@loomis/contracts';

import {
  isAdvancedTier,
  isCoreTier,
  mergeExperienceFlags,
  type ResolvedExperienceFlags,
} from './experience.js';

/** Core: SMS step-up for refunds at or above this amount (₦100,000). */
export const CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR = 10_000_000;

/** Roles that receive SMS OTP on first login / new device in Core (tier plan §4). */
export const CORE_SMS_LOGIN_ROLES: ReadonlySet<Role> = new Set([
  'school_owner',
  'principal',
  'accountant',
  'cashier',
]);

export type MfaChannel = 'sms' | 'totp';

export function resolveExperienceForMfa(
  experienceTier: ExperienceTier,
  flags: ResolvedExperienceFlags | null | undefined,
): { tier: ExperienceTier; flags: ResolvedExperienceFlags } {
  return {
    tier: experienceTier,
    flags: mergeExperienceFlags(flags),
  };
}

/** Core login SMS when tier is Core and role is leadership/finance (not teachers). */
export function coreLoginRequiresSms(
  role: Role,
  experienceTier: ExperienceTier,
  flags: ResolvedExperienceFlags,
): boolean {
  if (!isCoreTier(experienceTier)) return false;
  if (flags.totpOptional) return false;
  return CORE_SMS_LOGIN_ROLES.has(role);
}

/** Whether step-up for an action should verify SMS (Core) vs TOTP (Advanced/Enterprise). */
export function stepUpUsesSms(
  action: StepUpAction,
  experienceTier: ExperienceTier,
  flags: ResolvedExperienceFlags,
  context?: { refundAmountMinor?: number },
): boolean {
  if (isAdvancedTier(experienceTier) && flags.totpOptional) {
    return false;
  }
  if (!isCoreTier(experienceTier)) {
    return false;
  }

  switch (action) {
    case 'census_lock':
      return true;
    case 'refund_approve':
      return (context?.refundAmountMinor ?? 0) >= CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR;
    default:
      return false;
  }
}

/** Refund workflow approve: Core below ₦100k skips step-up; Advanced keeps existing TOTP rules. */
export function refundApproveRequiresStepUp(
  experienceTier: ExperienceTier,
  flags: ResolvedExperienceFlags,
  amountMinor: number,
): boolean {
  if (!isCoreTier(experienceTier)) {
    return true;
  }
  if (flags.totpOptional) {
    return true;
  }
  return amountMinor >= CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR;
}

export function stepUpChannelLabel(channel: MfaChannel): string {
  return channel === 'sms' ? 'SMS code' : 'authenticator code';
}

/** Parents: SMS on new device login (tier plan §4 — not tier-scoped). */
export function parentNewDeviceRequiresSms(role: Role): boolean {
  return role === 'parent';
}

/** Parents: SMS before initiating an online fee payment. */
export function parentPaymentRequiresSms(role: Role): boolean {
  return role === 'parent';
}
