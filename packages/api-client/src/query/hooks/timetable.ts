import { useQuery } from '@tanstack/react-query';
import type {
  TimetableListResponse,
  TimetableEntryResponse,
  CreateTimetableEntryRequest,
  PublishTimetableRequest,
  PublishTimetableResponse,
  TimetableSubjectOptionsResponse,
  TimetableTermSummaryResponse,
  TimetablePublishPreviewResponse,
  UpsertBellScheduleRequest,
  BellScheduleResponse,
  AssignmentResponse,
  CreateAssignmentRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const STALE_MS = 30_000;

export interface TimetableFilters {
  termId: string;
  classArmId: string;
}

// ── Timetable ───────────────────────────────────────────────────────────────────

export function timetableQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: TimetableFilters,
) {
  const queryKey = queryKeys.academic.timetable(tenantId, filters.termId, filters.classArmId);
  assertTenantScopedKey(queryKey, tenantId);
  const params = new URLSearchParams({
    termId: filters.termId,
    classArmId: filters.classArmId,
  });
  return {
    queryKey,
    queryFn: () =>
      client.get<TimetableListResponse>(
        `/tenants/${tenantId}/timetable?${params.toString()}`,
      ),
    staleTime: STALE_MS,
  };
}

export function useTimetable(tenantId: string, filters: TimetableFilters | null) {
  const client = useApiClient();
  return useQuery({
    ...timetableQueryOptions(client, tenantId, filters ?? { termId: '', classArmId: '' }),
    enabled: Boolean(tenantId && filters?.termId && filters?.classArmId),
  });
}

export function useTimetableSubjectOptions(tenantId: string, filters: TimetableFilters | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.timetableSubjectOptions(
      tenantId,
      filters?.termId ?? '',
      filters?.classArmId ?? '',
    ),
    queryFn: () => {
      const params = new URLSearchParams({
        termId: filters!.termId,
        classArmId: filters!.classArmId,
      });
      return client.get<TimetableSubjectOptionsResponse>(
        `/tenants/${tenantId}/timetable/subject-options?${params.toString()}`,
      );
    },
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && filters?.termId && filters?.classArmId),
  });
}

export function useTimetableSummary(tenantId: string, termId: string | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.timetableSummary(tenantId, termId ?? ''),
    queryFn: () =>
      client.get<TimetableTermSummaryResponse>(
        `/tenants/${tenantId}/timetable/summary?termId=${encodeURIComponent(termId!)}`,
      ),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && termId),
  });
}

export function useTimetablePublishPreview(tenantId: string, termId: string | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.timetablePublishPreview(tenantId, termId ?? ''),
    queryFn: () =>
      client.get<TimetablePublishPreviewResponse>(
        `/tenants/${tenantId}/timetable/publish-preview?termId=${encodeURIComponent(termId!)}`,
      ),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && termId),
  });
}

export function useStudentTimetable(tenantId: string, termId: string) {
  return useMyTimetable(tenantId, termId);
}

/** Published personal timetable for students and teaching staff (teacher / class teacher). */
export function useMyTimetable(tenantId: string, termId: string | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.studentTimetable(tenantId, termId ?? ''),
    queryFn: () =>
      client.get<TimetableListResponse>(
        `/tenants/${tenantId}/timetable/me?termId=${encodeURIComponent(termId!)}`,
      ),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && termId),
  });
}

export function useParentTimetable(tenantId: string, studentId: string, termId: string) {
  const client = useApiClient();
  const params = new URLSearchParams({ studentId, termId });
  return useQuery({
    queryKey: queryKeys.parent.timetable(tenantId, studentId, termId),
    queryFn: () =>
      client.get<TimetableListResponse>(`/parents/me/timetable?${params.toString()}`, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && studentId && termId),
  });
}

export function useCreateTimetableEntry(tenantId: string) {
  return useIdempotentMutation<CreateTimetableEntryRequest, TimetableEntryResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<TimetableEntryResponse>(`/tenants/${tenantId}/timetable-entries`, body, {
        idempotencyKey,
      }),
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
  return useIdempotentMutation<PublishTimetableRequest, PublishTimetableResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<PublishTimetableResponse>(`/tenants/${tenantId}/timetable/publish`, body, {
        idempotencyKey,
      }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

export function useBellSchedule(tenantId: string, academicYearId: string | null) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.academic.bellSchedule(tenantId, academicYearId ?? ''),
    queryFn: () =>
      client.get<BellScheduleResponse>(
        `/tenants/${tenantId}/bell-schedule?academicYearId=${encodeURIComponent(academicYearId!)}`,
      ),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && academicYearId),
  });
}

export function useUpsertBellSchedule(tenantId: string) {
  return useIdempotentMutation<UpsertBellScheduleRequest, BellScheduleResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.put<BellScheduleResponse>(`/tenants/${tenantId}/bell-schedule`, body, { idempotencyKey }),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}

// ── Assignments ─────────────────────────────────────────────────────────────────

interface AssignmentListResponse {
  assignments: AssignmentResponse[];
}

export function useAssignments(tenantId: string, classArmId?: string) {
  const client = useApiClient();
  const path = classArmId
    ? `/tenants/${tenantId}/assignments?classArmId=${encodeURIComponent(classArmId)}`
    : `/tenants/${tenantId}/assignments`;
  return useQuery({
    queryKey: queryKeys.academic.assignments(tenantId, classArmId ?? 'all'),
    queryFn: () => client.get<AssignmentListResponse>(path),
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
      client.post<AssignmentResponse>(
        `/tenants/${tenantId}/assignments/${assignmentId}/publish`,
        {},
        { idempotencyKey },
      ),
    invalidates: [queryKeys.academic.all(tenantId)],
  });
}
