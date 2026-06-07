import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateEnrollmentRequest,
  EnrollmentResponse,
  InitiateParentLinkRequest,
  ParentLinkResponse,
  RecordIdentityAttestationRequest,
  StudentListResponse,
  StudentProfileResponse,
  StudentResponse,
  TransferStudentOutRequest,
  TransferStudentOutResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
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

export function invalidateStudentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  studentId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.students.all(tenantId) });
  if (studentId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.students.detail(tenantId, studentId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.students.profile(tenantId, studentId),
    });
  }
}

/** US-SIS-003. Enroll an admitted student into a class arm for the open term. */
export function useCreateEnrollment(tenantId: string, studentId: string) {
  return useIdempotentMutation<CreateEnrollmentRequest, EnrollmentResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<EnrollmentResponse>(
        `/tenants/${tenantId}/students/${studentId}/enrollments`,
        body,
        { idempotencyKey },
      ),
    invalidates: [
      queryKeys.students.all(tenantId),
      queryKeys.students.detail(tenantId, studentId),
      queryKeys.students.profile(tenantId, studentId),
    ],
  });
}

/** US-SIS-004. Initiate parent-student link (Admin Officer). */
export function useInitiateParentLink(tenantId: string, studentId: string) {
  return useIdempotentMutation<InitiateParentLinkRequest, ParentLinkResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<ParentLinkResponse>(
        `/tenants/${tenantId}/students/${studentId}/parent-links`,
        body,
        { idempotencyKey },
      ),
    invalidates: [queryKeys.students.profile(tenantId, studentId)],
  });
}

/** US-SIS-006. Process a student transfer out. */
export function useTransferStudentOut(tenantId: string, studentId: string) {
  return useIdempotentMutation<TransferStudentOutRequest, TransferStudentOutResponse>({
    mutationFn: (client, body, idempotencyKey) =>
      client.post<TransferStudentOutResponse>(
        `/tenants/${tenantId}/students/${studentId}/transfer-out`,
        body,
        { idempotencyKey },
      ),
    invalidates: [
      queryKeys.students.all(tenantId),
      queryKeys.students.detail(tenantId, studentId),
      queryKeys.students.profile(tenantId, studentId),
    ],
  });
}

/** FR-SIS-002. Record identity attestation before billable enrollment. */
export function useRecordIdentityAttestation(tenantId: string, studentId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecordIdentityAttestationRequest) =>
      client.post<StudentResponse>(
        `/tenants/${tenantId}/students/${studentId}/identity-attestation`,
        body,
      ),
    onSuccess: () => invalidateStudentQueries(queryClient, tenantId, studentId),
  });
}
