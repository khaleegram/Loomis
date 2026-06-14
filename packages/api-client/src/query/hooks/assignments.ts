import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AssignmentListResponse,
  AssignmentResponse,
  CreateAssignmentRequest,
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  StudentAssignmentListResponse,
  SubmissionListResponse,
  SubmissionResponse,
  UpdateAssignmentRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { assertTenantScopedKey, queryKeys, type AssignmentListFilters } from '../keys.js';

const STALE_MS = 30_000;

export function assignmentsQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: AssignmentListFilters,
) {
  const queryKey = queryKeys.academic.assignments(tenantId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  const params = new URLSearchParams({
    termId: filters.termId,
    classArmId: filters.classArmId,
  });
  if (filters.subjectId) params.set('subjectId', filters.subjectId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AssignmentListResponse>(
        `/tenants/${tenantId}/assignments?${params.toString()}`,
      ),
    staleTime: STALE_MS,
  };
}

export function useAssignments(tenantId: string, filters: AssignmentListFilters | null) {
  const client = useApiClient();
  const enabled = Boolean(tenantId && filters?.termId && filters?.classArmId);

  return useQuery<AssignmentListResponse>({
    queryKey:
      enabled && filters
        ? queryKeys.academic.assignments(tenantId, filters)
        : (['academic', tenantId, 'assignments', 'disabled'] as const),
    queryFn: () => {
      if (!filters) return { assignments: [] };
      return assignmentsQueryOptions(client, tenantId, filters).queryFn();
    },
    enabled,
    staleTime: STALE_MS,
  });
}

export function useMyAssignments(tenantId: string, termId: string | null) {
  const client = useApiClient();
  return useQuery<StudentAssignmentListResponse>({
    queryKey: queryKeys.academic.myAssignments(tenantId, termId ?? ''),
    queryFn: () =>
      client.get<StudentAssignmentListResponse>(
        `/tenants/${tenantId}/assignments/me?termId=${encodeURIComponent(termId!)}`,
      ),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && termId),
  });
}

export function useCreateAssignment(tenantId: string) {
  return useIdempotentMutation<CreateAssignmentRequest, AssignmentResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<AssignmentResponse>(`/tenants/${tenantId}/assignments`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

export function useUpdateAssignment(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      ...body
    }: UpdateAssignmentRequest & { assignmentId: string }) =>
      client.patch<AssignmentResponse>(`/tenants/${tenantId}/assignments/${assignmentId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.all(tenantId) });
    },
  });
}

export function usePublishAssignment(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      client.post<AssignmentResponse>(
        `/tenants/${tenantId}/assignments/${assignmentId}/publish`,
        {},
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.all(tenantId) });
    },
  });
}

export function useAssignmentSubmissions(tenantId: string, assignmentId: string | null) {
  const client = useApiClient();
  return useQuery<SubmissionListResponse>({
    queryKey: queryKeys.academic.assignmentSubmissions(tenantId, assignmentId ?? ''),
    queryFn: () =>
      client.get<SubmissionListResponse>(
        `/tenants/${tenantId}/assignments/${assignmentId!}/submissions`,
      ),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && assignmentId),
  });
}

export function useSubmitAssignment(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      ...body
    }: CreateSubmissionRequest & { assignmentId: string }) =>
      client.post<SubmissionResponse>(
        `/tenants/${tenantId}/assignments/${assignmentId}/submissions`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.all(tenantId) });
    },
  });
}

export function useGradeSubmission(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      submissionId,
      ...body
    }: GradeSubmissionRequest & { submissionId: string }) =>
      client.patch<SubmissionResponse>(
        `/tenants/${tenantId}/submissions/${submissionId}/grade`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.academic.all(tenantId) });
    },
  });
}

export type { AssignmentListFilters };
