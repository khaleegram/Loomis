import type { ExperienceTier, FinanceMode } from '@loomis/contracts';
import type { ResolvedExperienceFlags } from '@loomis/core';

/** Tenant experience inputs for school nav filtering (Sprint 3). */
export type SchoolNavContext = {
  experienceTier: ExperienceTier;
  financeMode: FinanceMode;
  flags: ResolvedExperienceFlags;
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
