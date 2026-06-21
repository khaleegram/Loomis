import type {
  ExperienceTier,
  FinanceMode,
  TenantExperienceFlags,
  TenantExperienceResponse,
} from '@loomis/contracts';

export type { ExperienceTier, FinanceMode, TenantExperienceFlags, TenantExperienceResponse };

/** Resolved flags after merging stored partial JSON with tier defaults. */
export type ResolvedExperienceFlags = {
  workflowsInbox: boolean;
  timetableDedicatedOfficer: boolean;
  deputyExamEnabled: boolean;
  totpOptional: boolean;
};

export const DEFAULT_EXPERIENCE_FLAGS: ResolvedExperienceFlags = {
  workflowsInbox: false,
  timetableDedicatedOfficer: false,
  deputyExamEnabled: false,
  totpOptional: false,
};

export function mergeExperienceFlags(
  partial: TenantExperienceFlags | null | undefined,
): ResolvedExperienceFlags {
  return {
    workflowsInbox: partial?.workflowsInbox ?? DEFAULT_EXPERIENCE_FLAGS.workflowsInbox,
    timetableDedicatedOfficer:
      partial?.timetableDedicatedOfficer ?? DEFAULT_EXPERIENCE_FLAGS.timetableDedicatedOfficer,
    deputyExamEnabled: partial?.deputyExamEnabled ?? DEFAULT_EXPERIENCE_FLAGS.deputyExamEnabled,
    totpOptional: partial?.totpOptional ?? DEFAULT_EXPERIENCE_FLAGS.totpOptional,
  };
}

export function isCoreTier(tier: ExperienceTier): boolean {
  return tier === 'core';
}

export function isAdvancedTier(tier: ExperienceTier): boolean {
  return tier === 'advanced' || tier === 'enterprise';
}

export function isEnterpriseTier(tier: ExperienceTier): boolean {
  return tier === 'enterprise';
}

/** Advanced+ surfaces (workflows inbox, full nav matrix) when tier or explicit flag allows. */
export function workflowsInboxEnabled(
  tier: ExperienceTier,
  flags: ResolvedExperienceFlags,
): boolean {
  return isAdvancedTier(tier) && flags.workflowsInbox;
}

export function toTenantExperienceView(
  tenantId: string,
  experienceTier: ExperienceTier,
  financeMode: FinanceMode,
  storedFlags: TenantExperienceFlags | null | undefined,
): TenantExperienceResponse {
  return {
    tenantId,
    experienceTier,
    financeMode,
    flags: mergeExperienceFlags(storedFlags),
  };
}
