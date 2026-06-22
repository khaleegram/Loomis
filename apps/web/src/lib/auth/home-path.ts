import type { Role } from '@loomis/contracts';
import type { ExperienceTier, FinanceMode } from '@loomis/contracts';
import type { ResolvedExperienceFlags } from '@loomis/core';
import { isCoreTier } from '@loomis/core';

import { GROUP_PREFIX, ROLE_GROUP } from '@/lib/auth/route-groups';

export type HomePathContext = {
  financeMode?: FinanceMode;
  experienceTier?: ExperienceTier;
  flags?: ResolvedExperienceFlags;
};

/**
 * Post-login landing path — tier-aware for finance and timetable (Sprint 3).
 * Defaults match Core + combined finance when tenant experience is not loaded yet.
 */
export function homePathForRole(role: Role, ctx?: HomePathContext): string {
  const financeMode = ctx?.financeMode ?? 'combined';
  const tier = ctx?.experienceTier ?? 'core';
  const flags = ctx?.flags;

  if (role === 'dpo') return '/platform/compliance';
  if (role === 'regional_manager' || role === 'regional_subordinate') {
    return `${GROUP_PREFIX.regional}/dashboard`;
  }
  if (role === 'platform_owner' || role === 'platform_admin') {
    return `${GROUP_PREFIX.platform}/dashboard`;
  }
  if (role === 'parent' || role === 'student') {
    return `${GROUP_PREFIX.parent}/dashboard`;
  }
  if (role === 'exam_officer' || role === 'deputy_exam_officer') {
    return '/school/exams';
  }
  if (role === 'accountant') {
    return '/school/finance/payments/verify';
  }
  if (role === 'cashier') {
    return financeMode === 'combined'
      ? '/school/finance/payments/verify'
      : '/school/finance/payments/log';
  }
  if (role === 'timetable_officer') {
    if (isCoreTier(tier) && !flags?.timetableDedicatedOfficer) {
      return '/school/academic';
    }
    return '/school/timetable';
  }
  if (role === 'teacher') return '/school/dashboard';
  if (role === 'class_teacher') return '/school/dashboard';

  // School roles without a dedicated module home (owner, principal, admin) → dashboard.
  if (ROLE_GROUP[role] === 'school') return '/school/dashboard';

  return GROUP_PREFIX[ROLE_GROUP[role]];
}

/**
 * Edge-safe post-auth redirect when tenant experience is not loaded yet.
 * School roles land on `/school` for tier-aware routing (finance mode, flags).
 */
export function landingPathForRole(role: Role): string {
  if (ROLE_GROUP[role] === 'school') return '/school';
  return homePathForRole(role);
}
