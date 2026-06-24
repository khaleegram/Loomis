import type {
  ApproverChainStep,
  ExperienceTier,
  FinanceMode,
  TenantExperienceFlags,
  WorkflowType,
} from '@loomis/contracts';
import { DEFAULT_WORKFLOW_CHAINS } from '@loomis/contracts';
import { resolveEffectiveWorkflowChain } from '@loomis/core';

import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { workflowRepository } from '../repository/workflow.repository.js';
import type { ResolvedTemplate } from '../types.js';

function parseExperienceTier(value: string | undefined): ExperienceTier {
  if (value === 'advanced' || value === 'enterprise') return value;
  return 'core';
}

function parseFinanceMode(value: string | undefined): FinanceMode {
  return value === 'split' ? 'split' : 'combined';
}

function parseExperienceFlags(
  value: Record<string, boolean> | null | undefined,
): TenantExperienceFlags {
  return (value ?? {}) as TenantExperienceFlags;
}

/**
 * Resolves the approver chain for a workflow — tenant DB template overrides,
 * then tier-aware Core matrix, then platform defaults.
 */
export async function resolveWorkflowTemplate(
  workflowType: WorkflowType,
  tenantId: string | null,
  payload?: Record<string, unknown>,
): Promise<ResolvedTemplate> {
  const defaults = DEFAULT_WORKFLOW_CHAINS[workflowType];
  if (!defaults) {
    throw new Error(`Unknown workflow type: ${workflowType}`);
  }

  if (tenantId) {
    const tenantTemplate = await workflowRepository.findTemplate(tenantId, workflowType);
    if (tenantTemplate?.isActive) {
      return {
        workflowType,
        approverChain: tenantTemplate.approverChain as ApproverChainStep[],
        isMandatory: tenantTemplate.isMandatory,
      };
    }
  }

  const scopeTenantId = defaults.scope === 'platform' ? null : tenantId;
  const platformTemplate = await workflowRepository.findTemplate(scopeTenantId, workflowType);
  if (platformTemplate?.isActive) {
    return {
      workflowType,
      approverChain: platformTemplate.approverChain as ApproverChainStep[],
      isMandatory: platformTemplate.isMandatory,
    };
  }

  let approverChain = defaults.chain;

  if (tenantId) {
    const tenant = await tenantRepository.findById(tenantId);
    if (tenant) {
      approverChain = resolveEffectiveWorkflowChain({
        workflowType,
        experienceTier: parseExperienceTier(tenant.experienceTier),
        financeMode: parseFinanceMode(tenant.financeMode),
        flags: parseExperienceFlags(tenant.experienceFlags),
        payload: payload ?? {},
        defaultChain: defaults.chain,
      });
    }
  }

  return {
    workflowType,
    approverChain,
    isMandatory: defaults.isMandatory,
  };
}
