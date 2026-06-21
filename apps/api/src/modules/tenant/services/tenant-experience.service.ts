import type {
  ExperienceTier,
  FinanceMode,
  TenantExperienceFlags,
  TenantExperienceResponse,
  UpdateTenantExperienceRequest,
} from '@loomis/contracts';
import {
  mergeExperienceFlags,
  toTenantExperienceView,
  type ResolvedExperienceFlags,
} from '@loomis/core';
import { LoomisError } from '../../../shared/errors.js';
import { tenantRepository } from '../repository/tenant.repository.js';
import type { ActorContext } from '../types.js';

type TenantRow = NonNullable<Awaited<ReturnType<typeof tenantRepository.findById>>>;

function parseExperienceTier(value: string): ExperienceTier {
  if (value === 'core' || value === 'advanced' || value === 'enterprise') {
    return value;
  }
  return 'core';
}

function parseFinanceMode(value: string): FinanceMode {
  if (value === 'combined' || value === 'split') {
    return value;
  }
  return 'combined';
}

function rowToExperience(tenant: TenantRow): TenantExperienceResponse {
  return toTenantExperienceView(
    tenant.id,
    parseExperienceTier(tenant.experienceTier),
    parseFinanceMode(tenant.financeMode),
    tenant.experienceFlags as TenantExperienceFlags,
  );
}

export const tenantExperienceService = {
  async getExperience(tenantId: string): Promise<TenantExperienceResponse> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    return rowToExperience(tenant);
  },

  resolveFlags(tenant: TenantRow): ResolvedExperienceFlags {
    return mergeExperienceFlags(tenant.experienceFlags as TenantExperienceFlags);
  },

  /**
   * Platform ops may set tier and finance mode. Enterprise tier requires platform role.
   * Owner self-service for Advanced toggles lands in Sprint 8.
   */
  async updateExperience(
    tenantId: string,
    input: UpdateTenantExperienceRequest,
    actor: ActorContext,
  ): Promise<TenantExperienceResponse> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    const isPlatform = actor.role === 'platform_owner' || actor.role === 'platform_admin';

    if (input.experienceTier !== undefined && !isPlatform) {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Only platform operations can change experience tier',
      );
    }

    if (input.experienceTier === 'enterprise' && !isPlatform) {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Enterprise tier activation requires Loomis team approval',
      );
    }

    if (input.financeMode !== undefined && !isPlatform && actor.role !== 'school_owner') {
      throw new LoomisError('FORBIDDEN', 403, 'Not permitted to change finance mode');
    }

    if (input.flags !== undefined && !isPlatform && actor.role !== 'school_owner') {
      throw new LoomisError('FORBIDDEN', 403, 'Not permitted to change experience flags');
    }

    const baseFlags = mergeExperienceFlags(tenant.experienceFlags as TenantExperienceFlags);
    const mergedFlags =
      input.flags !== undefined
        ? {
            workflowsInbox: input.flags.workflowsInbox ?? baseFlags.workflowsInbox,
            timetableDedicatedOfficer:
              input.flags.timetableDedicatedOfficer ?? baseFlags.timetableDedicatedOfficer,
            deputyExamEnabled: input.flags.deputyExamEnabled ?? baseFlags.deputyExamEnabled,
            totpOptional: input.flags.totpOptional ?? baseFlags.totpOptional,
            admissionsRequirePrincipalApproval:
              input.flags.admissionsRequirePrincipalApproval ??
              baseFlags.admissionsRequirePrincipalApproval,
          }
        : undefined;

    const patch: {
      experienceTier?: string;
      financeMode?: string;
      experienceFlags?: Record<string, boolean>;
    } = {};

    if (input.experienceTier !== undefined) {
      patch.experienceTier = input.experienceTier;
    }
    if (input.financeMode !== undefined) {
      patch.financeMode = input.financeMode;
    }
    if (mergedFlags !== undefined) {
      patch.experienceFlags = mergedFlags;
    }

    const updated = await tenantRepository.updateExperience(tenantId, patch);

    if (!updated) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    return rowToExperience(updated);
  },
};
