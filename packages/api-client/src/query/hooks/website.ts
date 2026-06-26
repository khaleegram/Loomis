import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CheckWebsiteSlugResponse,
  PublicWebsiteSiteResponse,
  SubmitWebsiteInquiryRequest,
  SubmitWebsiteInquiryResponse,
  UpdateWebsiteInquiryRequest,
  UpdateWebsiteSiteRequest,
  WebsiteInquiryListResponse,
  WebsiteInquiryResponse,
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

export function useCheckWebsiteSlug(tenantId: string) {
  const client = useApiClient();
  return useMutation({
    mutationFn: (slug: string) =>
      client.get<CheckWebsiteSlugResponse>(
        `/tenants/${tenantId}/website/slug-check?slug=${encodeURIComponent(slug)}`,
        { headers: { 'X-Tenant-Id': tenantId } },
      ),
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

export function useSubmitWebsiteInquiry(slug: string) {
  const client = useApiClient();
  return useMutation({
    mutationFn: (body: SubmitWebsiteInquiryRequest) =>
      client.post<SubmitWebsiteInquiryResponse>(`/public/sites/${slug}/inquiries`, body, {
        skipAuth: true,
      }),
  });
}

export function useWebsiteInquiries(tenantId: string, status?: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.website.inquiries(tenantId, status),
    queryFn: () => {
      const params = status ? `?status=${encodeURIComponent(status)}` : '';
      return client.get<WebsiteInquiryListResponse>(
        `/tenants/${tenantId}/website/inquiries${params}`,
        { headers: { 'X-Tenant-Id': tenantId } },
      );
    },
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  });
}

export function useUpdateWebsiteInquiry(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      inquiryId,
      status,
    }: {
      inquiryId: string;
      status: UpdateWebsiteInquiryRequest['status'];
    }) =>
      client.patch<WebsiteInquiryResponse>(
        `/tenants/${tenantId}/website/inquiries/${inquiryId}`,
        { status },
        { headers: { 'X-Tenant-Id': tenantId } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website', tenantId, 'inquiries'] });
    },
  });
}
