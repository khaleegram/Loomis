import type { ExperienceTier, FinanceMode, Role } from '@loomis/contracts';
import type { ResolvedExperienceFlags } from '@loomis/core';

/** Tenant experience inputs for school nav filtering (Sprint 3). */
export type SchoolNavContext = {
  experienceTier: ExperienceTier;
  financeMode: FinanceMode;
  flags: ResolvedExperienceFlags;
  /** Active HRM subject/class-teacher assignments for the signed-in staff member. */
  hasTeachingDuties?: boolean;
  /** JWT primary + inferred extension roles for capability union (nav gating). */
  effectiveRoles?: Role[];
};

export const DEFAULT_SCHOOL_NAV_CONTEXT: SchoolNavContext = {
  experienceTier: 'core',
  financeMode: 'combined',
  flags: {
    workflowsInbox: false,
    timetableDedicatedOfficer: false,
    deputyExamEnabled: false,
    totpOptional: false,
    admissionsRequirePrincipalApproval: false,
    admissionsRequireOwnerApproval: false,
  },
};
