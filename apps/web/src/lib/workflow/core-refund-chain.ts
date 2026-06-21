import type { ExperienceTier, TenantExperienceFlags } from '@loomis/contracts';
import {
  CORE_OWNER_REFUND_THRESHOLD_MINOR,
  mergeExperienceFlags,
  refundApproverRolesFromChain,
  resolveCoreRefundChain,
  resolveEffectiveWorkflowChain,
  workflowsInboxEnabled,
} from '@loomis/core';
import { DEFAULT_WORKFLOW_CHAINS } from '@loomis/contracts';
import type { Role } from '@loomis/contracts';

/** Refund approver roles for UI timeline — tier-aware. */
export function refundApproverChainForTenant(input: {
  experienceTier: ExperienceTier;
  financeMode: 'combined' | 'split';
  flags: TenantExperienceFlags | null | undefined;
  amountMinor: number;
}): Role[] {
  const defaultChain = DEFAULT_WORKFLOW_CHAINS.refund_request.chain;
  const chain = resolveEffectiveWorkflowChain({
    workflowType: 'refund_request',
    experienceTier: input.experienceTier,
    financeMode: input.financeMode,
    flags: input.flags,
    payload: { amountMinor: input.amountMinor },
    defaultChain,
  });
  return refundApproverRolesFromChain(chain);
}

export function isCoreRefundBelowOwnerThreshold(amountMinor: number): boolean {
  return amountMinor < CORE_OWNER_REFUND_THRESHOLD_MINOR;
}

export function usesAdvancedWorkflowInbox(
  experienceTier: ExperienceTier,
  flags: TenantExperienceFlags | null | undefined,
): boolean {
  return workflowsInboxEnabled(experienceTier, mergeExperienceFlags(flags));
}

export { CORE_OWNER_REFUND_THRESHOLD_MINOR, resolveCoreRefundChain };
