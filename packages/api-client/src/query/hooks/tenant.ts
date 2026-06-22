import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SchoolBrandingResponse,
  TenantExperienceResponse,
  UpdateSchoolBrandingRequest,
  UpdateTenantExperienceRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';

const BRANDING_STALE_MS = 5 * 60_000;
const EXPERIENCE_STALE_MS = 5 * 60_000;

export function tenantExperienceQueryOptions(client: ApiClient, tenantId: string) {
  return {
    queryKey: queryKeys.tenant.experience(tenantId),
    queryFn: () =>
      client.get<TenantExperienceResponse>(`/tenants/${tenantId}/experience`, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    staleTime: EXPERIENCE_STALE_MS,
  };
}

export function useTenantExperienceQuery(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...tenantExperienceQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

export function useUpdateTenantExperience(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateTenantExperienceRequest) =>
      client.patch<TenantExperienceResponse>(`/tenants/${tenantId}/experience`, body, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tenant.experience(tenantId), data);
    },
  });
}

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
