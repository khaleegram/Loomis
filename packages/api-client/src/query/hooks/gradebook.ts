import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChildPublishedResultsResponse,
  CreateExamConfigRequest,
  CreateGradingSchemeRequest,
  ExamConfigListResponse,
  ExamConfigResponse,
  GradeCorrectionResponse,
  GradebookEntryListResponse,
  GradebookEntryResponse,
  GradingSchemeListResponse,
  GradingSchemeResponse,
  LockGradebookRequest,
  LockGradebookResponse,
  ListGradebookQuery,
  PublishResultsRequest,
  RequestGradeCorrectionRequest,
  ResultListResponse,
  StepUpAction,
  UpsertGradebookEntryRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import type { StepUpTokenResult } from '../../mutations/financial-mutation.js';
import { useFinancialMutation } from '../../mutations/useFinancialMutation.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import {
  assertTenantScopedKey,
  queryKeys,
  type GradebookListFilters,
} from '../keys.js';

const GRADEBOOK_STALE_MS = 30_000;

function invalidateGradebookQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  filters?: GradebookListFilters,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.academic.gradingSchemes(tenantId) });
  if (filters) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.academic.gradebookEntries(tenantId, filters),
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: queryKeys.academic.all(tenantId) });
  }
}

export function gradingSchemesQueryOptions(client: ApiClient, tenantId: string) {
  const queryKey = queryKeys.academic.gradingSchemes(tenantId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<GradingSchemeListResponse>(`/tenants/${tenantId}/grading-schemes`),
    staleTime: GRADEBOOK_STALE_MS,
  };
}

export function examConfigsQueryOptions(client: ApiClient, tenantId: string, termId: string) {
  const queryKey = queryKeys.academic.examConfigs(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<ExamConfigListResponse>(`/tenants/${tenantId}/terms/${termId}/exam-configs`),
    staleTime: GRADEBOOK_STALE_MS,
  };
}

export function gradebookEntriesQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: GradebookListFilters,
) {
  const queryKey = queryKeys.academic.gradebookEntries(tenantId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  const params = new URLSearchParams({
    termId: filters.termId,
    classArmId: filters.classArmId,
  });
  if (filters.subjectId) params.set('subjectId', filters.subjectId);
  return {
    queryKey,
    queryFn: () =>
      client.get<GradebookEntryListResponse>(
        `/tenants/${tenantId}/gradebook/entries?${params.toString()}`,
      ),
    staleTime: GRADEBOOK_STALE_MS,
  };
}

/** Grading schemes for the tenant (US-ACA-001). */
export function useGradingSchemes(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...gradingSchemesQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

/** Exam configs for a term. */
export function useExamConfigs(tenantId: string, termId: string) {
  const client = useApiClient();
  return useQuery({
    ...examConfigsQueryOptions(client, tenantId, termId),
    enabled: Boolean(tenantId && termId),
  });
}

/** Gradebook entries for term / class / optional subject. */
export function useGradebookEntries(tenantId: string, filters: GradebookListFilters | null) {
  const client = useApiClient();
  const enabled = Boolean(tenantId && filters?.termId && filters?.classArmId);

  return useQuery<GradebookEntryListResponse>({
    queryKey:
      enabled && filters
        ? queryKeys.academic.gradebookEntries(tenantId, filters)
        : (['academic', tenantId, 'gradebook', 'disabled'] as const),
    queryFn: () => {
      if (!filters) return { entries: [] };
      if (enabled && filters) {
        assertTenantScopedKey(queryKeys.academic.gradebookEntries(tenantId, filters), tenantId);
      }
      const params = new URLSearchParams({
        termId: filters.termId,
        classArmId: filters.classArmId,
      });
      if (filters.subjectId) params.set('subjectId', filters.subjectId);
      return client.get<GradebookEntryListResponse>(
        `/tenants/${tenantId}/gradebook/entries?${params.toString()}`,
      );
    },
    enabled,
    staleTime: GRADEBOOK_STALE_MS,
  });
}

/** Create a grading scheme (US-ACA-001). */
export function useCreateGradingScheme(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGradingSchemeRequest) =>
      client.post<GradingSchemeResponse>(`/tenants/${tenantId}/grading-schemes`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.gradingSchemes(tenantId) });
    },
  });
}

/** Create an exam config linking scheme to class/subject. */
export function useCreateExamConfig(tenantId: string, termId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExamConfigRequest) =>
      client.post<ExamConfigResponse>(`/tenants/${tenantId}/exam-configs`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.academic.examConfigs(tenantId, termId),
      });
    },
  });
}

/** Upsert a gradebook entry (US-ACA-002). */
export function useUpsertGradebookEntry(tenantId: string, filters: GradebookListFilters) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertGradebookEntryRequest) =>
      client.request<GradebookEntryResponse>(`/tenants/${tenantId}/gradebook/entries`, {
        method: 'PUT',
        body,
      }),
    onSuccess: () => invalidateGradebookQueries(queryClient, tenantId, filters),
  });
}

/** Request a grade correction (US-ACA-003). */
export function useRequestGradeCorrection(tenantId: string, entryId: string, filters: GradebookListFilters) {
  return useIdempotentMutation<RequestGradeCorrectionRequest, GradeCorrectionResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<GradeCorrectionResponse>(
        `/tenants/${tenantId}/gradebook/entries/${entryId}/corrections`,
        body,
        { idempotencyKey },
      ),
    invalidates: [queryKeys.academic.gradebookEntries(tenantId, filters)],
  });
}

/** Lock subject gradebook for a class (US-ACA-002). */
export function useLockGradebook(tenantId: string, filters: GradebookListFilters) {
  return useIdempotentMutation<LockGradebookRequest, LockGradebookResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<LockGradebookResponse>(`/tenants/${tenantId}/gradebook/lock`, body, {
        idempotencyKey,
      }),
    invalidates: [queryKeys.academic.gradebookEntries(tenantId, filters)],
  });
}

export interface UsePublishResultsConfig {
  tenantId: string;
  termId: string;
  classArmId: string;
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
}

/** Publish term results (US-ACA-004). */
export function usePublishResults(config: UsePublishResultsConfig) {
  const { tenantId, termId, classArmId, ensureStepUpToken } = config;
  return useFinancialMutation<PublishResultsRequest, ResultListResponse>({
    endpoint: `/tenants/${tenantId}/results/publish`,
    action: 'result_publish',
    ensureStepUpToken,
    invalidates: [
      queryKeys.academic.gradebookEntries(tenantId, { termId, classArmId }),
    ],
  });
}

/** Published term results for the logged-in student (US-STU-001). */
export function useMyResults(tenantId: string, termId: string | null) {
  const client = useApiClient();
  return useQuery<ChildPublishedResultsResponse>({
    queryKey: queryKeys.parent.myResults(tenantId, termId ?? ''),
    queryFn: () =>
      client.get<ChildPublishedResultsResponse>(
        `/tenants/${tenantId}/results/me?termId=${encodeURIComponent(termId!)}`,
      ),
    staleTime: GRADEBOOK_STALE_MS,
    enabled: Boolean(tenantId && termId),
  });
}

export type { ListGradebookQuery, GradebookListFilters };
