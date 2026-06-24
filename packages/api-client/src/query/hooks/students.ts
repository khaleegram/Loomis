import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateEnrollmentRequest,
  EnrollmentResponse,
  GenerateLeavingCertificateRequest,
  InitiateParentLinkRequest,
  LeavingCertificateListResponse,
  ParentLinkResponse,
  RecordIdentityAttestationRequest,
  SetStudentPhotoRequest,
  StudentCertificateListResponse,
  StudentCertificateResponse,
  StudentListResponse,
  StudentProfileResponse,
  StudentResponse,
  TermEnrollmentRosterResponse,
  TransferStudentOutRequest,
  TransferStudentOutResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useIdempotentMutation } from '../../mutations/useIdempotentMutation.js';
import { useApiClient } from '../context.js';
import { dashboardLiveQueryExtras, type QueryLiveOptions } from '../dashboard-live.js';
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
export function useStudents(
  tenantId: string,
  filters: StudentListFilters = {},
  options?: QueryLiveOptions,
) {
  const client = useApiClient();
  return useQuery({
    ...studentsListQueryOptions(client, tenantId, filters),
    ...dashboardLiveQueryExtras(options?.live),
  });
}

/** Single student record. */
export function useStudent(tenantId: string, studentId: string) {
  const client = useApiClient();
  return useQuery({
    ...studentDetailQueryOptions(client, tenantId, studentId),
    enabled: Boolean(tenantId && studentId),
  });
}

/** Active enrollments in a term for promotion staging (FR-ASM-007). */
export function useTermEnrollmentRoster(
  tenantId: string,
  termId: string,
  options?: QueryLiveOptions,
) {
  const client = useApiClient();
  const queryKey = queryKeys.students.enrollmentRoster(tenantId, termId);
  assertTenantScopedKey(queryKey, tenantId);
  return useQuery({
    queryKey,
    queryFn: () =>
      client.get<TermEnrollmentRosterResponse>(
        `/tenants/${tenantId}/terms/${termId}/enrollment-roster`,
      ),
    staleTime: STUDENT_LIST_STALE_MS,
    enabled: Boolean(tenantId && termId),
    ...dashboardLiveQueryExtras(options?.live),
  });
}

/** Leaving certificates issued for an academic year (US-ASM-006). */
export function useLeavingCertificates(tenantId: string, academicYearId: string) {
  const client = useApiClient();
  const queryKey = queryKeys.students.leavingCertificates(tenantId, academicYearId);
  assertTenantScopedKey(queryKey, tenantId);
  return useQuery({
    queryKey,
    queryFn: () =>
      client.get<LeavingCertificateListResponse>(
        `/tenants/${tenantId}/academic-years/${academicYearId}/leaving-certificates`,
      ),
    staleTime: STUDENT_LIST_STALE_MS,
    enabled: Boolean(tenantId && academicYearId),
  });
}

/** All certificates for a single student. */
export function useStudentCertificates(tenantId: string, studentId: string) {
  const client = useApiClient();
  const queryKey = queryKeys.students.certificates(tenantId, studentId);
  assertTenantScopedKey(queryKey, tenantId);
  return useQuery({
    queryKey,
    queryFn: () =>
      client.get<StudentCertificateListResponse>(
        `/tenants/${tenantId}/students/${studentId}/certificates`,
      ),
    staleTime: STUDENT_DETAIL_STALE_MS,
    enabled: Boolean(tenantId && studentId),
  });
}

/** On-demand leaving certificate generation (Principal / Owner). */
export function useGenerateLeavingCertificate(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      academicYearId,
    }: {
      studentId: string;
      academicYearId: string;
    }) =>
      client.post<StudentCertificateResponse>(
        `/tenants/${tenantId}/students/${studentId}/leaving-certificate`,
        { academicYearId } satisfies GenerateLeavingCertificateRequest,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.students.leavingCertificates(tenantId, variables.academicYearId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.students.certificates(tenantId, variables.studentId),
      });
    },
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

export function useSetStudentPhoto(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      storageObjectId,
    }: {
      studentId: string;
      storageObjectId: string;
    }) =>
      client.patch<StudentResponse>(
        `/tenants/${tenantId}/students/${studentId}/photo`,
        { storageObjectId } satisfies SetStudentPhotoRequest,
      ),
    onSuccess: (_data, variables) => {
      invalidateStudentQueries(queryClient, tenantId, variables.studentId);
    },
  });
}

/** US-REV-002 — census lock attestation history (read-only). */
export function useTenantAttestations(tenantId: string, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.attestations.list(tenantId),
    queryFn: () =>
      client.get<{ attestations: import('@loomis/contracts').EnrollmentAttestationResponse[] }>(
        `/tenants/${tenantId}/attestations`,
        { headers: { 'X-Tenant-Id': tenantId } },
      ),
    enabled: enabled && Boolean(tenantId),
    staleTime: 60_000,
  });
}
