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
  /** When true, Principal/Owner must approve; Admin cannot decide. */
  admissionsRequirePrincipalApproval: boolean;
  /** When true, admission workflow includes Owner as second approver (Advanced). */
  admissionsRequireOwnerApproval: boolean;
};

export const DEFAULT_EXPERIENCE_FLAGS: ResolvedExperienceFlags = {
  workflowsInbox: false,
  timetableDedicatedOfficer: false,
  deputyExamEnabled: false,
  totpOptional: false,
  admissionsRequirePrincipalApproval: false,
  admissionsRequireOwnerApproval: false,
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
    admissionsRequirePrincipalApproval:
      partial?.admissionsRequirePrincipalApproval ??
      DEFAULT_EXPERIENCE_FLAGS.admissionsRequirePrincipalApproval,
    admissionsRequireOwnerApproval:
      partial?.admissionsRequireOwnerApproval ??
      DEFAULT_EXPERIENCE_FLAGS.admissionsRequireOwnerApproval,
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
  if (isEnterpriseTier(tier)) return true;
  return isAdvancedTier(tier) && flags.workflowsInbox;
}

/** Default feature flags applied when Loomis activates Enterprise tier. */
export function enterpriseDefaultFlags(): ResolvedExperienceFlags {
  return {
    workflowsInbox: true,
    timetableDedicatedOfficer: true,
    deputyExamEnabled: true,
    totpOptional: true,
    admissionsRequirePrincipalApproval: true,
    admissionsRequireOwnerApproval: true,
  };
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
