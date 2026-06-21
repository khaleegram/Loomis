'use client';

import { useTenantExperienceQuery } from '@loomis/api-client';
import {
  isAdvancedTier,
  isCoreTier,
  isEnterpriseTier,
  mergeExperienceFlags,
  type ResolvedExperienceFlags,
} from '@loomis/core';
import type { ExperienceTier, FinanceMode } from '@loomis/contracts';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export function useTenantExperience() {
  const tenantId = useTenantId();
  const query = useTenantExperienceQuery(tenantId ?? '');

  const experienceTier: ExperienceTier = query.data?.experienceTier ?? 'core';
  const financeMode: FinanceMode = query.data?.financeMode ?? 'combined';
  const flags: ResolvedExperienceFlags = mergeExperienceFlags(query.data?.flags);

  return {
    ...query,
    tenantId,
    experienceTier,
    financeMode,
    flags,
    isCore: isCoreTier(experienceTier),
    isAdvanced: isAdvancedTier(experienceTier),
    isEnterprise: isEnterpriseTier(experienceTier),
  };
}
