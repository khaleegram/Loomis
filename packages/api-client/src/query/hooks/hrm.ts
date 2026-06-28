import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AssignClassTeacherRequest,
  ChangeStaffRoleRequest,
  ClassTeacherAssignmentResponse,
  CreateSubjectAssignmentRequest,
  DeactivateStaffRequest,
  DesignateBackupRequest,
  InviteStaffRequest,
  CreateStaffRequest,
  ReactivateStaffRequest,
  RemoveSubjectAssignmentRequest,
  ResendStaffInvitationResponse,
  StaffDetailResponse,
  StaffDirectoryResponse,
  StaffProfileResponse,
  SubjectAssignmentResponse,
} from '@loomis/contracts';
import type { ApiClient } from '../../http/client.js';
import { useApiClient } from '../context.js';
import { dashboardLiveQueryExtras, type QueryLiveOptions } from '../dashboard-live.js';
import { assertTenantScopedKey, queryKeys } from '../keys.js';

const STAFF_LIST_STALE_MS = 30_000;
const STAFF_DETAIL_STALE_MS = 30_000;

export interface InviteStaffResult {
  profile: StaffProfileResponse;
  invitation: { id: string; staffProfileId: string; email: string; expiresAt: string };
}

export interface CreateStaffResult {
  profile: StaffProfileResponse;
  loginEmail: string;
  temporaryPassword: string;
  credentialsEmail: import('@loomis/contracts').EmailDeliveryResult;
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
      client.get<StaffDetailResponse>(
        `/tenants/${tenantId}/staff/${staffProfileId}`,
      ),
    staleTime: STAFF_DETAIL_STALE_MS,
  };
}

/** Staff directory (US-HRM-006). */
export function useStaffDirectory(tenantId: string, options?: QueryLiveOptions) {
  const client = useApiClient();
  return useQuery({
    ...staffListQueryOptions(client, tenantId),
    enabled: Boolean(tenantId),
    ...dashboardLiveQueryExtras(options?.live),
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
  termId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.hrm.staffList(tenantId) });
  if (staffProfileId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.hrm.staffDetail(tenantId, staffProfileId),
    });
  }
  if (termId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.academic.teachingRoster(tenantId, termId),
    });
  } else {
    void queryClient.invalidateQueries({
      queryKey: ['academic', tenantId, 'teaching', 'roster'],
    });
  }
}

/** Add a new staff member with a temporary password (US-HRM-001). */
export function useCreateStaff(tenantId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateStaffRequest) =>
      client.post<CreateStaffResult>(`/tenants/${tenantId}/staff`, body),
    onSuccess: () => invalidateStaffQueries(queryClient, tenantId),
  });
}

/** @deprecated Use useCreateStaff — invitation flow replaced by provisioned passwords. */
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
      invalidateStaffQueries(queryClient, tenantId, variables.staffProfileId, variables.termId),
  });
}

/** Remove a subject assignment (US-HRM-002). */
export function useRemoveSubjectAssignment(tenantId: string, defaultStaffProfileId?: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      staffProfileId: _profileId,
      ...body
    }: RemoveSubjectAssignmentRequest & {
      assignmentId: string;
      staffProfileId?: string;
    }) =>
      client.post<SubjectAssignmentResponse>(
        `/tenants/${tenantId}/staff/subject-assignments/${assignmentId}/remove`,
        body,
      ),
    onSuccess: (_data, variables) =>
      invalidateStaffQueries(
        queryClient,
        tenantId,
        variables.staffProfileId ?? defaultStaffProfileId,
        undefined,
      ),
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
      invalidateStaffQueries(queryClient, tenantId, variables.staffProfileId, variables.termId),
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

/** Reactivate a deactivated staff member (FR-HRM-006). */
export function useReactivateStaff(tenantId: string, staffProfileId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReactivateStaffRequest) =>
      client.post<StaffProfileResponse>(
        `/tenants/${tenantId}/staff/${staffProfileId}/reactivate`,
        body,
      ),
    onSuccess: () => invalidateStaffQueries(queryClient, tenantId, staffProfileId),
  });
}

/** Resend a pending staff invitation (US-HRM-009). */
export function useResendStaffInvitation(tenantId: string, staffProfileId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      client.post<ResendStaffInvitationResponse>(
        `/tenants/${tenantId}/staff/${invitationId}/resend`,
      ),
    onSuccess: () => invalidateStaffQueries(queryClient, tenantId, staffProfileId),
  });
}

/** Designate a backup for a singleton role (FR-HRM-005). */
export function useDesignateBackup(tenantId: string, staffProfileId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DesignateBackupRequest) =>
      client.post(`/tenants/${tenantId}/staff/backup-designations`, body),
    onSuccess: (_data, variables) =>
      invalidateStaffQueries(
        queryClient,
        tenantId,
        variables.primaryStaffProfileId === staffProfileId
          ? staffProfileId
          : variables.backupStaffProfileId,
      ),
  });
}
