import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChildAttendanceResponse,
  ChildPublishedResultsResponse,
  HackathonDemoResetResponse,
  ParentDashboardResponse,
  ParentFeeStatusResponse,
  ParentPaymentsListResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { dashboardLiveQueryExtras, type QueryLiveOptions } from '../dashboard-live.js';
import { queryKeys } from '../keys.js';

const STALE_MS = 30_000;

type ParentDashboardArg = boolean | { enabled?: boolean; live?: boolean };

function normalizeParentDashboardArg(arg: ParentDashboardArg = true) {
  if (typeof arg === 'boolean') {
    return { enabled: arg, live: false };
  }
  return { enabled: arg.enabled ?? true, live: arg.live ?? false };
}

export function useParentDashboard(arg: ParentDashboardArg = true) {
  const { enabled, live } = normalizeParentDashboardArg(arg);
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.parent.dashboard(),
    queryFn: () => client.get<ParentDashboardResponse>('/parents/me/dashboard'),
    staleTime: STALE_MS,
    enabled,
    ...dashboardLiveQueryExtras(live),
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

export function useParentFees(
  tenantId: string,
  studentId: string | null,
  termId: string | null,
) {
  const client = useApiClient();
  const params = new URLSearchParams();
  if (studentId) params.set('studentId', studentId);
  if (termId) params.set('termId', termId);
  return useQuery<ParentFeeStatusResponse>({
    queryKey: queryKeys.parent.fees(tenantId, studentId ?? '', termId ?? ''),
    queryFn: () =>
      client.get<ParentFeeStatusResponse>(`/parents/me/fees?${params.toString()}`, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && studentId && termId),
  });
}

export function useParentPayments(
  tenantId: string,
  studentId: string | null,
  termId: string | null,
) {
  const client = useApiClient();
  const params = new URLSearchParams();
  if (studentId) params.set('studentId', studentId);
  if (termId) params.set('termId', termId);
  return useQuery<ParentPaymentsListResponse>({
    queryKey: queryKeys.parent.payments(tenantId, studentId ?? '', termId ?? ''),
    queryFn: () =>
      client.get<ParentPaymentsListResponse>(`/parents/me/payments?${params.toString()}`, {
        headers: { 'X-Tenant-Id': tenantId },
      }),
    staleTime: STALE_MS,
    enabled: Boolean(tenantId && studentId && termId),
  });
}

export function useHackathonResetDemoFees(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentId: string; termId: string }) => {
      const params = new URLSearchParams({
        studentId: input.studentId,
        termId: input.termId,
      });
      return client.post<HackathonDemoResetResponse>(
        `/parents/me/fees/hackathon-reset?${params.toString()}`,
        {},
        { headers: { 'X-Tenant-Id': tenantId } },
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.parent.dashboard() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.parent.fees(tenantId, variables.studentId, variables.termId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.parent.payments(tenantId, variables.studentId, variables.termId),
      });
    },
  });
}
