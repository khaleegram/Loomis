import type {
  ApproverChainStep,
  ExperienceTier,
  FinanceMode,
  Role,
  TenantExperienceFlags,
  WorkflowType,
} from '@loomis/contracts';

import { isAdvancedTier, mergeExperienceFlags, workflowsInboxEnabled } from './experience.js';

/** Core: refunds at or above this amount require Owner approval (₦50,000). */
export const CORE_OWNER_REFUND_THRESHOLD_MINOR = 5_000_000;

export type CoreRefundSingleApprover = 'principal' | 'owner';

const DEFAULT_STEP_TIMEOUT_HOURS = 48;

function chainStep(role: Role, escalatesToRole?: Role): ApproverChainStep {
  return {
    role,
    timeoutHours: DEFAULT_STEP_TIMEOUT_HOURS,
    ...(escalatesToRole ? { escalatesToRole } : {}),
  };
}

/** Resolves Core refund approver chain from amount and optional tenant override. */
export function resolveCoreRefundChain(
  amountMinor: number,
  flags: TenantExperienceFlags | null | undefined,
): ApproverChainStep[] {
  const override = flags?.coreRefundSingleApprover;
  if (override === 'principal') {
    return [chainStep('principal', 'school_owner')];
  }
  if (override === 'owner') {
    return [chainStep('school_owner')];
  }

  if (amountMinor >= CORE_OWNER_REFUND_THRESHOLD_MINOR) {
    return [chainStep('school_owner')];
  }
  return [chainStep('principal', 'school_owner')];
}

/** Maps refund workflow steps to approver roles for UI timelines. */
export function refundApproverRolesFromChain(chain: ApproverChainStep[]): Role[] {
  return chain.map((step) => step.role);
}

/** Core-tier workflow chains (ROLE_EXPERIENCE_TIER_PLAN.md §5). */
export function resolveCoreWorkflowChain(
  workflowType: WorkflowType,
  opts: {
    amountMinor?: number;
    flags?: TenantExperienceFlags | null;
  },
): ApproverChainStep[] | null {
  switch (workflowType) {
    case 'refund_request':
      return resolveCoreRefundChain(opts.amountMinor ?? 0, opts.flags);
    case 'fee_structure_change':
      return [chainStep('principal', 'school_owner')];
    case 'staff_role_change':
      return [chainStep('school_owner')];
    case 'student_promotion_batch':
    case 'staff_deactivation':
    case 'student_transfer_out':
      return [chainStep('principal')];
    default:
      return null;
  }
}

export function amountMinorFromWorkflowPayload(
  payload: Record<string, unknown> | null | undefined,
): number {
  const raw = payload?.amountMinor ?? payload?.amount_minor;
  return typeof raw === 'number' ? raw : 0;
}

/**
 * Effective approver chain for a tenant — Core matrix unless Advanced multi-step
 * approvals are enabled (workflows inbox flag).
 */
export function resolveEffectiveWorkflowChain(input: {
  workflowType: WorkflowType;
  experienceTier: ExperienceTier;
  financeMode: FinanceMode;
  flags: TenantExperienceFlags | null | undefined;
  payload?: Record<string, unknown>;
  defaultChain: ApproverChainStep[];
}): ApproverChainStep[] {
  const resolvedFlags = mergeExperienceFlags(input.flags);
  const useAdvancedChains =
    isAdvancedTier(input.experienceTier) && workflowsInboxEnabled(input.experienceTier, resolvedFlags);

  if (useAdvancedChains) {
    return input.defaultChain;
  }

  const coreChain = resolveCoreWorkflowChain(input.workflowType, {
    amountMinor: amountMinorFromWorkflowPayload(input.payload),
    ...(input.flags !== undefined ? { flags: input.flags } : {}),
  });
  if (coreChain) {
    return coreChain;
  }

  return input.defaultChain;
}

/** Skip redundant leadership step when Owner and Principal share one user account. */
export function shouldSkipLeadershipStep(params: {
  actorUserId: string;
  actorRole: Role;
  stepApproverRole: Role;
  ownerUserId: string | null;
  principalUserId: string | null;
}): boolean {
  const { ownerUserId, principalUserId, actorUserId, actorRole, stepApproverRole } = params;
  if (!ownerUserId || !principalUserId || ownerUserId !== principalUserId) {
    return false;
  }
  if (actorUserId !== ownerUserId) {
    return false;
  }
  const leadershipRoles: Role[] = ['principal', 'school_owner'];
  return leadershipRoles.includes(stepApproverRole) && stepApproverRole !== actorRole;
}
