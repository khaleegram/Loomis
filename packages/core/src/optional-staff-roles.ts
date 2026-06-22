import type { ExperienceTier, StaffPrimaryRole, TenantExperienceFlags } from '@loomis/contracts';

import { isAdvancedTier, mergeExperienceFlags, type ResolvedExperienceFlags } from './experience.js';

/** Optional Advanced roles gated by experience flags (Sprint 11). */
export function isOptionalStaffRoleEnabled(
  role: StaffPrimaryRole,
  tier: ExperienceTier,
  flags: TenantExperienceFlags | ResolvedExperienceFlags | null | undefined,
): boolean {
  const resolved = mergeExperienceFlags(flags as TenantExperienceFlags | null | undefined);
  if (role === 'timetable_officer') {
    return isAdvancedTier(tier) && resolved.timetableDedicatedOfficer;
  }
  if (role === 'deputy_exam_officer') {
    return isAdvancedTier(tier) && resolved.deputyExamEnabled;
  }
  return true;
}
