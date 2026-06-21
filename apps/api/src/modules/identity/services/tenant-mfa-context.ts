import type { ExperienceTier, TenantExperienceFlags } from '@loomis/contracts';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';

export interface TenantMfaContext {
  experienceTier: ExperienceTier;
  experienceFlags: TenantExperienceFlags;
}

function parseExperienceTier(value: string | undefined): ExperienceTier {
  if (value === 'advanced' || value === 'enterprise') return value;
  return 'core';
}

export async function loadTenantMfaContext(
  tenantId: string | null,
): Promise<TenantMfaContext | null> {
  if (!tenantId) return null;
  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) return null;
  return {
    experienceTier: parseExperienceTier(tenant.experienceTier),
    experienceFlags: (tenant.experienceFlags ?? {}) as TenantExperienceFlags,
  };
}
