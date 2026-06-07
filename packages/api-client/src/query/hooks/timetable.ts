// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import type {
  TimetableListResponse,
  TimetableEntryResponse,
  CreateTimetableEntryRequest,
  PublishTimetableRequest,
  PromotionListResponse,
  StagePromotionRequest,
  ConfirmPromotionRequest,
  AssignmentResponse,
  CreateAssignmentRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const STALE_MS = 30_000;

// ── Timetable ───────────────────────────────────────────────────────────────────

export function timetableQueryOptions(client: ApiClient, tenantId: string, termId: string) {
  const queryKey = queryKeys.academic.timetable(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<TimetableListResponse>(`/tenants/${tenantId}/timetable`, { params: { termId } }),
    staleTime: STALE_MS,
  };
}

export function useTimetable(tenantId: string, termId: string) {
  const client = useApiClient();
  return useQuery({ ...timetableQueryOptions(client, tenantId, termId), enabled: Boolean(tenantId && termId) });
}

export function useCreateTimetableEntry(tenantId: string) {
  return useIdempotentMutation<CreateTimetableEntryRequest, TimetableEntryResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<TimetableEntryResponse>(`/tenants/${tenantId}/timetable-entries`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

export function useDeleteTimetableEntry(tenantId: string) {
  return useIdempotentMutation<{ entryId: string }, void>({
    mutationFn: (client, body) =>
      client.delete(`/tenants/${tenantId}/timetable-entries/${body.entryId}`),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

export function usePublishTimetable(tenantId: string) {
  return useIdempotentMutation<PublishTimetableRequest, { published: boolean }>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post(`/tenants/${tenantId}/timetable/publish`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

// ── Assignments ─────────────────────────────────────────────────────────────────

interface AssignmentListResponse {
  assignments: AssignmentResponse[];
}

export function useAssignments(tenantId: string, classArmId?: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.assignments(tenantId, classArmId ?? 'all'),
    queryFn: () =>
      client.get<AssignmentListResponse>(`/tenants/${tenantId}/assignments`, {
        params: classArmId ? { classArmId } : undefined,
      }),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId),
  });
}

export function useCreateAssignment(tenantId: string) {
  return useIdempotentMutation<CreateAssignmentRequest, AssignmentResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<AssignmentResponse>(`/tenants/${tenantId}/assignments`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

export function usePublishAssignment(tenantId: string, assignmentId: string) {
  return useIdempotentMutation<void, AssignmentResponse>({
    mutationFn: (client, _body, idempotencyKey) =>
      client.post<AssignmentResponse>(`/tenants/${tenantId}/assignments/${assignmentId}/publish`, {}, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

// ── Promotions ──────────────────────────────────────────────────────────────────

export function usePromotions(tenantId: string, yearId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.promotions(tenantId, yearId),
    queryFn: () =>
      client.get<PromotionListResponse>(`/tenants/${tenantId}/academic-years/${yearId}/promotions`),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && yearId),
  });
}

export function useStagePromotion(tenantId: string) {
  return useIdempotentMutation<StagePromotionRequest, PromotionListResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<PromotionListResponse>(`/tenants/${tenantId}/promotions`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

export function useConfirmPromotion(tenantId: string) {
  return useIdempotentMutation<ConfirmPromotionRequest, { confirmed: true }>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post(`/tenants/${tenantId}/promotions/confirm`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}
