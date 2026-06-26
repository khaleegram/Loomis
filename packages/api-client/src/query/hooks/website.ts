import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  PublicWebsiteSiteResponse,
  UpdateWebsiteSiteRequest,
  WebsitePublishResponse,
  WebsiteSiteResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';

const WEBSITE_STALE_MS = 60_000;

export function websiteSiteQueryOptions(client: ApiClient, tenantId: string) {
  return {
    queryKey: queryKeys.website.site(tenantId),
    queryFn: () =>
      client.get<WebsiteSiteResponse>(`/tenants/${tenantId}/website`, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    staleTime: WEBSITE_STALE_MS,
  };
}

export function useWebsiteSite(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...websiteSiteQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

export function useUpdateWebsiteSite(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateWebsiteSiteRequest) =>
      client.put<WebsiteSiteResponse>(`/tenants/${tenantId}/website`, body, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.website.site(tenantId), data);
    },
  });
}

export function usePublishWebsite(tenantId: string) {
  return useIdempotentMutation<void, WebsitePublishResponse>({
    mutationFn: (client, _body, idempotencyKey) =>
      client.post<WebsitePublishResponse>(`/tenants/${tenantId}/website/publish`, undefined, {
        headers: {
          'X-Tenant-Id': tenantId,
          'Idempotency-Key': idempotencyKey,
        },
      }),
    invalidates: [queryKeys.website.site(tenantId)],
  });
}

export function useUnpublishWebsite(tenantId: string) {
  return useIdempotentMutation<void, WebsiteSiteResponse>({
    mutationFn: (client, _body, idempotencyKey) =>
      client.post<WebsiteSiteResponse>(`/tenants/${tenantId}/website/unpublish`, undefined, {
        headers: {
          'X-Tenant-Id': tenantId,
          'Idempotency-Key': idempotencyKey,
        },
      }),
    invalidates: [queryKeys.website.site(tenantId)],
  });
}

export function publicSiteQueryOptions(client: ApiClient, slug: string) {
  return {
    queryKey: queryKeys.publicSite(slug),
    queryFn: () => client.get<PublicWebsiteSiteResponse>(`/public/sites/${slug}`),
    staleTime: 60_000,
  };
}

export function usePublicSite(slug: string) {
  const client = useApiClient();
  return useQuery({
    ...publicSiteQueryOptions(client, slug),
    enabled: Boolean(slug),
  });
}
