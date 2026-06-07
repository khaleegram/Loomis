import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdmissionDecisionRequest,
  AdmissionDecisionResponse,
  AdmissionListResponse,
  AdmissionResponse,
  CreateAdmissionRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys, type AdmissionListFilters } from '../keys.js';

const ADMISSIONS_STALE_MS = 30_000;

export function admissionsListQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: AdmissionListFilters = {},
) {
  const queryKey = queryKeys.admissions.list(tenantId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AdmissionListResponse>(`/tenants/${tenantId}/admissions`),
    staleTime: ADMISSIONS_STALE_MS,
  };
}

export function admissionDetailQueryOptions(
  client: ApiClient,
  tenantId: string,
  admissionId: string,
) {
  const queryKey = queryKeys.admissions.detail(tenantId, admissionId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AdmissionResponse>(
        `/tenants/${tenantId}/admissions/${admissionId}`,
      ),
    staleTime: ADMISSIONS_STALE_MS,
  };
}

/** Tenant-scoped admissions pipeline (US-SIS-001/002). */
export function useAdmissions(tenantId: string, filters: AdmissionListFilters = {}) {
  const client = useApiClient();
  return useQuery({
    ...admissionsListQueryOptions(client, tenantId, filters),
    enabled: Boolean(tenantId),
  });
}

/** Single admission application. */
export function useAdmission(tenantId: string, admissionId: string) {
  const client = useApiClient();
  return useQuery({
    ...admissionDetailQueryOptions(client, tenantId, admissionId),
    enabled: Boolean(tenantId && admissionId),
  });
}

function invalidateAdmissionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  admissionId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.admissions.all(tenantId) });
  if (admissionId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.admissions.detail(tenantId, admissionId),
    });
  }
}

/** US-SIS-001. Register a new applicant (Admin Officer). */
export function useCreateAdmission(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAdmissionRequest) =>
      client.post<AdmissionResponse>(`/tenants/${tenantId}/admissions`, body),
    onSuccess: () => invalidateAdmissionQueries(queryClient, tenantId),
  });
}

/** US-SIS-002. Principal approves or declines an application. */
export function useAdmissionDecision(tenantId: string, admissionId: string) {
  return useIdempotentMutation<AdmissionDecisionRequest, AdmissionDecisionResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<AdmissionDecisionResponse>(
        `/tenants/${tenantId}/admissions/${admissionId}/decision`,
        body,
        { idempotencyKey },
      ),
    invalidates: [
      queryKeys.admissions.all(tenantId),
      queryKeys.admissions.detail(tenantId, admissionId),
      queryKeys.students.all(tenantId),
    ],
  });
}

export { invalidateAdmissionQueries };
