import { useQuery } from '@tanstack/react-query';
import type {
  StudentListResponse,
  StudentProfileResponse,
  StudentResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys, type StudentListFilters } from '../keys.js';

const STUDENT_LIST_STALE_MS = 30_000;
const STUDENT_DETAIL_STALE_MS = 30_000;

export function studentsListQueryOptions(
  client: ApiClient,
  tenantId: string,
  filters: StudentListFilters = {},
) {
  const queryKey = queryKeys.students.list(tenantId, filters);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<StudentListResponse>(`/tenants/${tenantId}/students`),
    staleTime: STUDENT_LIST_STALE_MS,
  };
}

export function studentDetailQueryOptions(
  client: ApiClient,
  tenantId: string,
  studentId: string,
) {
  const queryKey = queryKeys.students.detail(tenantId, studentId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<StudentResponse>(`/tenants/${tenantId}/students/${studentId}`),
    staleTime: STUDENT_DETAIL_STALE_MS,
  };
}

export function studentProfileQueryOptions(
  client: ApiClient,
  tenantId: string,
  studentId: string,
) {
  const queryKey = queryKeys.students.profile(tenantId, studentId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<StudentProfileResponse>(
        `/tenants/${tenantId}/students/${studentId}/profile`,
      ),
    staleTime: STUDENT_DETAIL_STALE_MS,
  };
}

/** Tenant-scoped student registry list. */
export function useStudents(tenantId: string, filters: StudentListFilters = {}) {
  const client = useApiClient();
  return useQuery(studentsListQueryOptions(client, tenantId, filters));
}

/** Single student record. */
export function useStudent(tenantId: string, studentId: string) {
  const client = useApiClient();
  return useQuery({
    ...studentDetailQueryOptions(client, tenantId, studentId),
    enabled: Boolean(tenantId && studentId),
  });
}

/** Aggregated student profile (principal/owner). */
export function useStudentProfile(tenantId: string, studentId: string) {
  const client = useApiClient();
  return useQuery({
    ...studentProfileQueryOptions(client, tenantId, studentId),
    enabled: Boolean(tenantId && studentId),
  });
}
