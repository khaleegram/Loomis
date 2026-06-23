import type { ApiClient } from '@loomis/api-client';
import {
  academicYearsQueryOptions,
  queryKeys,
  tenantExperienceQueryOptions,
} from '@loomis/api-client';
import type { SchoolBrandingResponse } from '@loomis/contracts';
import type { QueryClient } from '@tanstack/react-query';

const BRANDING_STALE_MS = 5 * 60_000;

/** Warm school console shell queries after auth (years, tier, branding). */
export async function prefetchSchoolConsoleCache(
  queryClient: QueryClient,
  client: ApiClient,
  tenantId: string,
): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery(academicYearsQueryOptions(client, tenantId)),
    queryClient.prefetchQuery(tenantExperienceQueryOptions(client, tenantId)),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tenant.branding(tenantId),
      queryFn: () => client.get<SchoolBrandingResponse>(`/tenants/${tenantId}/branding`),
      staleTime: BRANDING_STALE_MS,
    }),
  ]);
}
