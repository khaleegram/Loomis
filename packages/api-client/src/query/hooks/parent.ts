import { useQuery } from '@tanstack/react-query';
import type { ChildAttendanceResponse, ChildPublishedResultsResponse, ParentDashboardResponse } from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { queryKeys } from '../keys.js';

const STALE_MS = 30_000;

export function useParentDashboard(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.parent.dashboard(),
    queryFn: () => client.get<ParentDashboardResponse>('/parents/me/dashboard'),
    staleTime: STALE_MS,
    enabled,
  });
}

export function useParentAttendance(
  tenantId: string,
  studentId: string | null,
  termId: string | null,
) {
  const client = useApiClient();
  const params = new URLSearchParams();
  if (studentId) params.set('studentId', studentId);
  if (termId) params.set('termId', termId);
  return useQuery<ChildAttendanceResponse>({
    queryKey: queryKeys.parent.attendance(tenantId, studentId ?? '', termId ?? ''),
    queryFn: () =>
      client.get<ChildAttendanceResponse>(`/parents/me/attendance?${params.toString()}`, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && studentId && termId),
  });
}

export function useParentResults(
  tenantId: string,
  studentId: string | null,
  termId: string | null,
) {
  const client = useApiClient();
  const params = new URLSearchParams();
  if (studentId) params.set('studentId', studentId);
  if (termId) params.set('termId', termId);
  return useQuery<ChildPublishedResultsResponse>({
    queryKey: queryKeys.parent.results(tenantId, studentId ?? '', termId ?? ''),
    queryFn: () =>
      client.get<ChildPublishedResultsResponse>(`/parents/me/results?${params.toString()}`, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && studentId && termId),
  });
}
