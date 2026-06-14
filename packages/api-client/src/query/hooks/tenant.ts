import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SchoolBrandingResponse, UpdateSchoolBrandingRequest } from '@loomis/contracts';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';

const BRANDING_STALE_MS = 5 * 60_000;

export function useSchoolBranding(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.tenant.branding(tenantId),
    queryFn: () => client.get<SchoolBrandingResponse>(`/tenants/${tenantId}/branding`),
    staleTime: BRANDING_STALE_MS,
    enabled: Boolean(tenantId),
  });
}

export function useUpdateSchoolBranding(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateSchoolBrandingRequest) =>
      client.put<SchoolBrandingResponse>(`/tenants/${tenantId}/branding`, body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tenant.branding(tenantId), data);
    },
  });
}
