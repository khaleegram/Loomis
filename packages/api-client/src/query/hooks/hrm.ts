import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AssignClassTeacherRequest,
  ChangeStaffRoleRequest,
  ClassTeacherAssignmentResponse,
  CreateSubjectAssignmentRequest,
  DeactivateStaffRequest,
  InviteStaffRequest,
  RemoveSubjectAssignmentRequest,
  StaffDirectoryResponse,
  StaffProfileResponse,
  SubjectAssignmentResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const STAFF_LIST_STALE_MS = 30_000;
const STAFF_DETAIL_STALE_MS = 30_000;

export interface InviteStaffResult {
  profile: StaffProfileResponse;
  invitation: { id: string; staffProfileId: string; email: string; expiresAt: string };
}

export function staffListQueryOptions(client: ApiClient, tenantId: string) {
  const queryKey = queryKeys.hrm.staffList(tenantId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<StaffDirectoryResponse>(`/tenants/${tenantId}/staff`),
    staleTime: STAFF_LIST_STALE_MS,
  };
}

export function staffDetailQueryOptions(
  client: ApiClient,
  tenantId: string,
  staffProfileId: string,
) {
  const queryKey = queryKeys.hrm.staffDetail(tenantId, staffProfileId);
  assertTenantScopedKey(queryKey, tenantId);
  return {
    queryKey,
    queryFn: () =>
      client.get<StaffProfileResponse>(
        `/tenants/${tenantId}/staff/${staffProfileId}`,
      ),
    staleTime: STAFF_DETAIL_STALE_MS,
  };
}

/** Staff directory (US-HRM-006). */
export function useStaffDirectory(tenantId: string) {
  const client = useApiClient();
  return useQuery({
    ...staffListQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
  });
}

/** Single staff profile. */
export function useStaffMember(tenantId: string, staffProfileId: string) {
  const client = useApiClient();
  return useQuery({
    ...staffDetailQueryOptions(client, tenantId, staffProfileId),
    enabled: Boolean(tenantId && staffProfileId),
  });
}

function invalidateStaffQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  staffProfileId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.hrm.staffList(tenantId) });
  if (staffProfileId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.hrm.staffDetail(tenantId, staffProfileId),
    });
  }
}

/** Invite a new staff member (US-HRM-001). */
export function useInviteStaff(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteStaffRequest) =>
      client.post<InviteStaffResult>(`/tenants/${tenantId}/staff/invitations`, body),
    onSuccess: () => invalidateStaffQueries(queryClient, tenantId),
  });
}

/** Change a staff member's primary role (US-HRM-004). */
export function useChangeStaffRole(tenantId: string, staffProfileId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ChangeStaffRoleRequest) =>
      client.post<StaffProfileResponse>(
        `/tenants/${tenantId}/staff/${staffProfileId}/role`,
        body,
      ),
    onSuccess: () => invalidateStaffQueries(queryClient, tenantId, staffProfileId),
  });
}

/** Assign a subject to a teacher (US-HRM-002). */
export function useCreateSubjectAssignment(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubjectAssignmentRequest) =>
      client.post<SubjectAssignmentResponse>(
        `/tenants/${tenantId}/staff/subject-assignments`,
        body,
      ),
    onSuccess: (_data, variables) =>
      invalidateStaffQueries(queryClient, tenantId, variables.staffProfileId),
  });
}

/** Remove a subject assignment (US-HRM-002). */
export function useRemoveSubjectAssignment(tenantId: string, staffProfileId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      ...body
    }: RemoveSubjectAssignmentRequest & { assignmentId: string }) =>
      client.post<SubjectAssignmentResponse>(
        `/tenants/${tenantId}/staff/subject-assignments/${assignmentId}/remove`,
        body,
      ),
    onSuccess: () => invalidateStaffQueries(queryClient, tenantId, staffProfileId),
  });
}

/** Assign a class teacher (US-HRM-003). */
export function useAssignClassTeacher(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignClassTeacherRequest) =>
      client.post<ClassTeacherAssignmentResponse>(
        `/tenants/${tenantId}/staff/class-teacher-assignments`,
        body,
      ),
    onSuccess: (_data, variables) =>
      invalidateStaffQueries(queryClient, tenantId, variables.staffProfileId),
  });
}

/** Deactivate a staff member (US-HRM-005). */
export function useDeactivateStaff(tenantId: string, staffProfileId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeactivateStaffRequest) =>
      client.post<StaffProfileResponse>(
        `/tenants/${tenantId}/staff/${staffProfileId}/deactivate`,
        body,
      ),
    onSuccess: () => invalidateStaffQueries(queryClient, tenantId, staffProfileId),
  });
}
