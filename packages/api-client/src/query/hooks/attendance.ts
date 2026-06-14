import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AmendAttendanceRequest,
  AttendanceListResponse,
  AttendanceRecordResponse,
  ChildAttendanceResponse,
  MarkAttendanceRequest,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys, type AttendanceListFilters } from '../keys.js';

const ATTENDANCE_STALE_MS = 15_000;

export function attendanceQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: AttendanceListFilters,
) {
  const queryKey = queryKeys.academic.attendance(tenantId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  const params = new URLSearchParams({
    termId: filters.termId,
    classArmId: filters.classArmId,
  });
  if (filters.attendanceDate) params.set('attendanceDate', filters.attendanceDate);
  if (filters.studentId) params.set('studentId', filters.studentId);
  return {
    queryKey,
    queryFn: () =>
      client.get<AttendanceListResponse>(
        `/tenants/${tenantId}/attendance?${params.toString()}`,
      ),
    staleTime: ATTENDANCE_STALE_MS,
  };
}

/** Attendance records for a class (US-ACA-005). */
export function useAttendance(tenantId: string, filters: AttendanceListFilters | null) {
  const client = useApiClient();
  const enabled = Boolean(tenantId && filters?.termId && filters?.classArmId);

  return useQuery<AttendanceListResponse>({
    queryKey:
      enabled && filters
        ? queryKeys.academic.attendance(tenantId, filters)
        : (['academic', tenantId, 'attendance', 'disabled'] as const),
    queryFn: () => {
      if (!filters) return { records: [] };
      if (enabled && filters) {
        assertTenantScopedKey(queryKeys.academic.attendance(tenantId, filters), tenantId);
      }
      const params = new URLSearchParams({
        termId: filters.termId,
        classArmId: filters.classArmId,
      });
      if (filters.attendanceDate) params.set('attendanceDate', filters.attendanceDate);
      if (filters.studentId) params.set('studentId', filters.studentId);
      return client.get<AttendanceListResponse>(
        `/tenants/${tenantId}/attendance?${params.toString()}`,
      );
    },
    enabled,
    staleTime: ATTENDANCE_STALE_MS,
  });
}

/** Mark attendance for today (US-ACA-005). */
export function useMarkAttendance(tenantId: string, filters: AttendanceListFilters) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkAttendanceRequest) =>
      client.post<{ records: AttendanceRecordResponse[] }>(
        `/tenants/${tenantId}/attendance`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.academic.attendance(tenantId, filters),
      });
    },
  });
}

/** Amend a same-day attendance record (US-ACA-005). */
export function useAmendAttendance(tenantId: string, filters: AttendanceListFilters) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, ...body }: AmendAttendanceRequest & { recordId: string }) =>
      client.patch<AttendanceRecordResponse>(
        `/tenants/${tenantId}/attendance/${recordId}`,
        body,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.academic.attendance(tenantId, filters),
      });
    },
  });
}

export type { AttendanceListFilters };

export function useMyAttendance(tenantId: string, termId: string | null) {
  const client = useApiClient();
  return useQuery<ChildAttendanceResponse>({
    queryKey: queryKeys.parent.myAttendance(tenantId, termId ?? ''),
    queryFn: () =>
      client.get<ChildAttendanceResponse>(
        `/tenants/${tenantId}/attendance/me?termId=${encodeURIComponent(termId!)}`,
      ),
    staleTime: ATTENDANCE_STALE_MS,
    enabled: Boolean(tenantId && termId),
  });
}

/** Term attendance for a student — school oversight (principal / owner / admin). */
export function useStudentTermAttendance(
  tenantId: string,
  studentId: string | null,
  termId: string | null,
) {
  const client = useApiClient();
  return useQuery<ChildAttendanceResponse>({
    queryKey: queryKeys.students.termAttendance(tenantId, studentId ?? '', termId ?? ''),
    queryFn: () =>
      client.get<ChildAttendanceResponse>(
        `/tenants/${tenantId}/students/${studentId}/attendance?termId=${encodeURIComponent(termId!)}`,
      ),
    staleTime: ATTENDANCE_STALE_MS,
    enabled: Boolean(tenantId && studentId && termId),
  });
}
