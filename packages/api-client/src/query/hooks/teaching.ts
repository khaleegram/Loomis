import { useQuery } from '@tanstack/react-query';
import type { TeachingStaffContextResponse } from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const STALE_MS = 30_000;

export function teachingStaffContextQueryOptions(client: ApiClient, tenantId: string, termId: string) {
  const queryKey = queryKeys.academic.teachingStaffContext(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<TeachingStaffContextResponse>(
        `/tenants/${tenantId}/teaching/me?termId=${encodeURIComponent(termId)}`,
      ),
    staleTime: STALE_MS,
  };
}

export function useTeachingStaffContext(tenantId: string, termId: string | null) {
  const client = useApiClient();
  return useQuery({
    ...teachingStaffContextQueryOptions(client, tenantId, termId ?? ''),
    enabled: Boolean(tenantId && termId),
  });
}
