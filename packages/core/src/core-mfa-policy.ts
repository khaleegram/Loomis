import type { ExperienceTier, Role, StepUpAction } from '@loomis/contracts';

import {
  isAdvancedTier,
  isCoreTier,
  isEnterpriseTier,
  mergeExperienceFlags,
  type ResolvedExperienceFlags,
} from './experience.js';

/** Core: SMS step-up for refunds at or above this amount (₦100,000). */
export const CORE_SMS_REFUND_STEPUP_THRESHOLD_MINOR = 10_000_000;

/** Leadership/finance roles that may enroll optional TOTP for step-up (Advanced tier). */
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

/** School logins use password only; SMS login MFA is not used. */
export function coreLoginRequiresSms(
  _role: Role,
  _experienceTier: ExperienceTier,
  _flags: ResolvedExperienceFlags,
): boolean {
  return false;
}

/** Whether step-up for an action should verify SMS (Core) vs TOTP (Advanced/Enterprise). */
export function stepUpUsesSms(
  action: StepUpAction,
  experienceTier: ExperienceTier,
  flags: ResolvedExperienceFlags,
  context?: { refundAmountMinor?: number },
): boolean {
  if (enterpriseMandatoryTotpStepUp(action, experienceTier)) {
    return false;
  }
  if (isAdvancedTier(experienceTier) && flags.totpOptional) {
    return false;
  }
  if (!isCoreTier(experienceTier)) {
    return false;
  }

  switch (action) {
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
  if (isEnterpriseTier(experienceTier)) {
    return true;
  }
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

/** Parents sign in with password only (no device SMS challenge). */
export function parentNewDeviceRequiresSms(_role: Role): boolean {
  return false;
}

/** Advanced optional TOTP enrollment (step-up); not used for login MFA. */
export function advancedOptionalTotpLogin(
  role: Role,
  experienceTier: ExperienceTier,
  flags: ResolvedExperienceFlags,
): boolean {
  return isAdvancedTier(experienceTier) && flags.totpOptional && CORE_SMS_LOGIN_ROLES.has(role);
}

const ENTERPRISE_MANDATORY_STEPUP_ACTIONS: ReadonlySet<StepUpAction> = new Set([
  'refund_approve',
  'data_export',
  'result_publish',
  'ledger_adjustment',
  'financial_override',
  'psf_rate_change',
]);

/** Enterprise: high-risk actions always require authenticator step-up (never SMS). */
export function enterpriseMandatoryTotpStepUp(
  action: StepUpAction,
  experienceTier: ExperienceTier,
): boolean {
  return isEnterpriseTier(experienceTier) && ENTERPRISE_MANDATORY_STEPUP_ACTIONS.has(action);
}
