import type { Role } from '@loomis/contracts';

import { can } from './capabilities.js';
import type { ResolvedExperienceFlags } from './experience.js';

const LEADERSHIP_ADMISSION_ROLES = new Set<Role>(['school_owner', 'principal']);

/**
 * When false (Core default), admissions are auto-approved on register if the submitter
 * may decide — Admin runs register + admit in one action.
 */
export function shouldAutoApproveAdmissionOnCreate(flags: ResolvedExperienceFlags): boolean {
  return !flags.admissionsRequirePrincipalApproval;
}

/**
 * Whether this role may approve/decline admissions for the tenant's current policy.
 * Core default: Admin Officer decides. When `admissionsRequirePrincipalApproval` is on,
 * only Principal and School Owner may decide (Admin registers only).
 */
export function canDecideAdmissions(role: Role, flags: ResolvedExperienceFlags): boolean {
  if (!can(role, 'admissions.approve')) {
    return false;
  }
  if (flags.admissionsRequirePrincipalApproval) {
    return LEADERSHIP_ADMISSION_ROLES.has(role);
  }
  return true;
}
