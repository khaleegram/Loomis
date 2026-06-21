import { createHash, randomBytes } from 'node:crypto';
  import type {
  AssignClassTeacherRequest,
  ChangeStaffRoleRequest,
  ClassTeacherAssignmentResponse,
  DesignateBackupRequest,
  EmailDeliveryResult,
  FinanceMode,
  SetPhotoRequest,
  StaffDetailResponse,
  StaffDirectoryEntryResponse,
  StaffInvitationResponse,
  StaffPendingInvitationSummary,
  StaffPrimaryRole,
  StaffProfileResponse,
  SubjectAssignmentResponse,
} from '@loomis/contracts';
import { staffAccountService } from '../../identity/services/staff-account.service.js';
import { DEFAULT_STAFF_PROVISIONED_PASSWORD } from '../../identity/services/provisioned-password.service.js';
import { transactionalEmailService } from '../../comms/services/transactional-email.service.js';
import { workflowService } from '../../workflow/services/workflow.service.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { LoomisError } from '../../../shared/errors.js';
import { hrmEvents } from '../events/index.js';
import { staffRepository } from '../repository/staff.repository.js';
import type {
  ActorContext,
  CreateSubjectAssignmentInput,
  DeactivateStaffInput,
  InviteStaffInput,
  CreateStaffInput,
} from '../types.js';

const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;
const SINGLETON_ROLES = new Set<StaffPrimaryRole>(['accountant', 'exam_officer']);
const FINANCE_PRIMARY_ROLES = new Set<StaffPrimaryRole>(['accountant', 'cashier']);

export type ChangeStaffRoleResult =
  | { kind: 'applied'; profile: StaffProfileResponse }
  | { kind: 'pending'; workflowInstanceId: string; workflowType: 'staff_role_change' };

function parseFinanceMode(value: string | undefined): FinanceMode {
  return value === 'split' ? 'split' : 'combined';
}

async function loadTenantFinanceMode(tenantId: string): Promise<FinanceMode> {
  const tenant = await tenantRepository.findById(tenantId);
  if (!tenant) {
    throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
  }
  return parseFinanceMode(tenant.financeMode);
}

async function assertSplitFinanceSoDForUser(
  tenantId: string,
  userId: string,
  newRole: StaffPrimaryRole,
  financeMode: FinanceMode,
): Promise<void> {
  if (financeMode !== 'split') return;
  if (!FINANCE_PRIMARY_ROLES.has(newRole)) return;

  const opposing = newRole === 'cashier' ? 'accountant' : 'cashier';
  const profile = await staffRepository.findProfileByUserId(tenantId, userId);
  if (!profile || profile.status !== 'active') return;

  const roles = await staffRepository.listActiveRoles(tenantId, profile.id);
  const primary = roles.find((assignment) => assignment.assignmentType === 'primary');
  if (primary?.role === opposing) {
    throw new LoomisError(
      'HRM_ROLE_CONFLICT',
      409,
      'Split finance mode requires separate cashier and accountant accounts; one person cannot hold both roles',
    );
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function requireTenant(actor: ActorContext, tenantId: string): void {
  if (actor.tenantId !== null && actor.tenantId !== tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
  }
}

function serializeProfile(
  profile: NonNullable<Awaited<ReturnType<typeof staffRepository.findProfileById>>>,
  roles: Awaited<ReturnType<typeof staffRepository.listActiveRoles>>,
  userPhotoStorageObjectId?: string | null,
): StaffProfileResponse {
  const primary = roles.find((assignment) => assignment.assignmentType === 'primary');
  const extensions = roles
    .filter((assignment) => assignment.assignmentType === 'extension')
    .map((assignment) => assignment.role as StaffProfileResponse['roleExtensions'][number]);

  return {
    id: profile.id,
    tenantId: profile.tenantId,
    userId: profile.userId,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    status: profile.status as StaffProfileResponse['status'],
    primaryRole: (primary?.role as StaffPrimaryRole | undefined) ?? null,
    roleExtensions: extensions,
    joinedAt: profile.joinedAt?.toISOString() ?? null,
    deactivatedAt: profile.deactivatedAt?.toISOString() ?? null,
    photoStorageObjectId: profile.photoStorageObjectId ?? userPhotoStorageObjectId ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

function serializeInvitation(
  invitation: NonNullable<Awaited<ReturnType<typeof staffRepository.findActiveInvitationForProfile>>>,
): StaffInvitationResponse {
  return {
    id: invitation.id,
    staffProfileId: invitation.staffProfileId,
    email: invitation.email,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    isExpired: invitation.expiresAt <= new Date(),
  };
}

function serializePendingInvitationSummary(
  invitation: NonNullable<Awaited<ReturnType<typeof staffRepository.findActiveInvitationForProfile>>>,
): StaffPendingInvitationSummary {
  const expiresAt = invitation.expiresAt.toISOString();
  return {
    id: invitation.id,
    expiresAt,
    isExpired: invitation.expiresAt <= new Date(),
  };
}

function serializeSubjectAssignment(
  assignment: NonNullable<Awaited<ReturnType<typeof staffRepository.findActiveSubjectAssignment>>>,
): SubjectAssignmentResponse {
  return {
    id: assignment.id,
    staffProfileId: assignment.staffProfileId,
    termId: assignment.termId,
    classArmId: assignment.classArmId,
    subjectId: assignment.subjectId,
    active: assignment.active,
    effectiveFrom: assignment.effectiveFrom.toISOString(),
    effectiveTo: assignment.effectiveTo?.toISOString() ?? null,
  };
}

function serializeClassTeacherAssignment(
  assignment: NonNullable<Awaited<ReturnType<typeof staffRepository.findActiveClassTeacherForArm>>>,
): ClassTeacherAssignmentResponse {
  return {
    id: assignment.id,
    staffProfileId: assignment.staffProfileId,
    termId: assignment.termId,
    classArmId: assignment.classArmId,
    active: assignment.active,
    effectiveFrom: assignment.effectiveFrom.toISOString(),
    effectiveTo: assignment.effectiveTo?.toISOString() ?? null,
  };
}

export const staffService = {
  async createStaff(
    tenantId: string,
    input: CreateStaffInput,
    actor: ActorContext,
  ): Promise<{ profile: StaffProfileResponse; loginEmail: string; temporaryPassword: string; credentialsEmail: EmailDeliveryResult }> {
    requireTenant(actor, tenantId);

    const temporaryPassword = input.temporaryPassword ?? DEFAULT_STAFF_PROVISIONED_PASSWORD;
    const email = input.email.toLowerCase();

    const user = await staffAccountService.createActiveStaffAccount({
      tenantId,
      email,
      phone: input.phone,
      role: input.primaryRole,
      password: temporaryPassword,
      displayName: input.fullName,
    });

    await assertSplitFinanceSoDForUser(tenantId, user.id, input.primaryRole, await loadTenantFinanceMode(tenantId));

    const now = new Date();
    const created = await staffRepository.createStaffProfile({
      profile: {
        tenantId,
        userId: user.id,
        fullName: input.fullName,
        email,
        phone: input.phone,
        status: 'active',
        joinedAt: now,
        createdById: actor.userId,
      },
      roleAssignment: {
        tenantId,
        role: input.primaryRole,
        assignmentType: 'primary',
        approvedById: actor.userId,
      },
    });

    const credentialsEmail = await transactionalEmailService.sendStaffAccountCredentials({
      tenantId,
      userId: user.id,
      to: email,
      fullName: input.fullName,
      loginEmail: email,
      temporaryPassword,
    });

    return {
      profile: serializeProfile(created.profile, [created.roleAssignment]),
      loginEmail: email,
      temporaryPassword,
      credentialsEmail,
    };
  },

  async inviteStaff(
    tenantId: string,
    input: InviteStaffInput,
    actor: ActorContext,
  ): Promise<{ profile: StaffProfileResponse; invitation: StaffInvitationResponse }> {
    requireTenant(actor, tenantId);

    const user = await staffAccountService.createPendingStaffAccount({
      tenantId,
      email: input.email,
      phone: input.phone,
      role: input.primaryRole,
      displayName: input.fullName,
    });

    await assertSplitFinanceSoDForUser(
      tenantId,
      user.id,
      input.primaryRole,
      await loadTenantFinanceMode(tenantId),
    );

    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const created = await staffRepository.createStaffWithInvitation({
      profile: {
        tenantId,
        userId: user.id,
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone,
        createdById: actor.userId,
      },
      roleAssignment: {
        tenantId,
        role: input.primaryRole,
        assignmentType: 'primary',
        approvedById: actor.userId,
      },
      invitation: {
        tenantId,
        userId: user.id,
        email: input.email.toLowerCase(),
        tokenHash: hashToken(rawToken),
        expiresAt,
        invitedById: actor.userId,
      },
    });

    // BLOCKED: invitation onboarding requires sending the one-time link by AWS
    // SES, but SES is not configured in env/comms yet. Do not mock email delivery
    // or log the raw token. Wire this to SES once SES credentials and templates
    // are added to src/config/env.ts and the comms module.

    return {
      profile: serializeProfile(created.profile, [created.roleAssignment]),
      invitation: serializeInvitation(created.invitation),
    };
  },

  async acceptInvitation(
    tenantId: string,
    input: { token: string; password: string },
  ): Promise<StaffProfileResponse> {
    const invitation = await staffRepository.findInvitationByTokenHash(hashToken(input.token), tenantId);
    if (!invitation || invitation.acceptedAt || invitation.revokedAt) {
      throw new LoomisError('HRM_INVITATION_INVALID', 400, 'Invitation is invalid');
    }
    if (invitation.expiresAt <= new Date()) {
      throw new LoomisError('HRM_INVITATION_EXPIRED', 410, 'Invitation has expired');
    }

    await staffAccountService.activatePendingStaffAccount(invitation.userId, input.password);
    const accepted = await staffRepository.acceptInvitation(tenantId, invitation.id);
    const roles = await staffRepository.listActiveRoles(tenantId, accepted.profile.id);
    return serializeProfile(accepted.profile, roles);
  },

  async listStaff(tenantId: string, actor: ActorContext): Promise<StaffDirectoryEntryResponse[]> {
    requireTenant(actor, tenantId);
    const profiles = await staffRepository.listProfiles(tenantId);
    const responses: StaffDirectoryEntryResponse[] = [];
    for (const { profile, userPhotoStorageObjectId } of profiles) {
      const roles = await staffRepository.listActiveRoles(tenantId, profile.id);
      const entry: StaffDirectoryEntryResponse = serializeProfile(
        profile,
        roles,
        userPhotoStorageObjectId,
      );
      if (profile.status === 'pending') {
        const invitation = await staffRepository.findActiveInvitationForProfile(tenantId, profile.id);
        if (invitation) {
          entry.pendingInvitation = serializePendingInvitationSummary(invitation);
        }
      }
      responses.push(entry);
    }
    return responses;
  },

  async getStaff(
    tenantId: string,
    staffProfileId: string,
    actor: ActorContext,
  ): Promise<StaffDetailResponse> {
    requireTenant(actor, tenantId);
    const row = await staffRepository.findProfileWithUserPhoto(tenantId, staffProfileId);
    if (!row) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
    }
    const { profile, userPhotoStorageObjectId } = row;
    const roles = await staffRepository.listActiveRoles(tenantId, profile.id);
    const invitation =
      profile.status === 'pending'
        ? await staffRepository.findActiveInvitationForProfile(tenantId, profile.id)
        : null;
    const subjectAssignments = await staffRepository.listActiveSubjectAssignments(
      tenantId,
      profile.id,
    );
    const classTeacherAssignments = await staffRepository.listActiveClassTeacherAssignments(
      tenantId,
      profile.id,
    );

    return {
      ...serializeProfile(profile, roles, userPhotoStorageObjectId),
      pendingInvitation: invitation ? serializeInvitation(invitation) : null,
      subjectAssignments: subjectAssignments.map(serializeSubjectAssignment),
      classTeacherAssignments: classTeacherAssignments.map(serializeClassTeacherAssignment),
    };
  },

  async findActiveProfileByUserId(tenantId: string, userId: string) {
    return staffRepository.findProfileByUserId(tenantId, userId);
  },

  async findActiveSubjectAssignmentForUser(input: {
    tenantId: string;
    userId: string;
    termId: string;
    classArmId: string;
    subjectId: string;
  }) {
    const profile = await staffRepository.findProfileByUserId(input.tenantId, input.userId);
    if (!profile || profile.status !== 'active') return null;
    return staffRepository.findActiveSubjectAssignment({
      tenantId: input.tenantId,
      staffProfileId: profile.id,
      termId: input.termId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
    });
  },

  async findActiveClassTeacherAssignmentForUser(input: {
    tenantId: string;
    userId: string;
    termId: string;
    classArmId: string;
  }) {
    const profile = await staffRepository.findProfileByUserId(input.tenantId, input.userId);
    if (!profile || profile.status !== 'active') return null;
    const assignment = await staffRepository.findActiveClassTeacherForStaffTerm(
      input.tenantId,
      profile.id,
      input.termId,
    );
    if (!assignment || assignment.classArmId !== input.classArmId) return null;
    return assignment;
  },

  async changePrimaryRole(
    tenantId: string,
    staffProfileId: string,
    input: ChangeStaffRoleRequest,
    actor: ActorContext,
  ): Promise<ChangeStaffRoleResult> {
    requireTenant(actor, tenantId);

    if (actor.role === 'principal') {
      const pending = await this.requestStaffRoleChange(tenantId, staffProfileId, input, actor);
      return { kind: 'pending', ...pending };
    }

    if (actor.role !== 'school_owner') {
      throw new LoomisError('FORBIDDEN', 403, 'Only the school owner may finalize role changes');
    }

    const profile = await this.finalizePrimaryRoleChange(
      tenantId,
      staffProfileId,
      input,
      actor.userId,
    );
    return { kind: 'applied', profile };
  },

  async requestStaffRoleChange(
    tenantId: string,
    staffProfileId: string,
    input: ChangeStaffRoleRequest,
    actor: ActorContext,
  ): Promise<{ workflowInstanceId: string; workflowType: 'staff_role_change' }> {
    requireTenant(actor, tenantId);
    const profile = await this.requireActiveProfile(tenantId, staffProfileId);
    if (profile.userId === actor.userId) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Staff cannot request a role change for themselves');
    }

    const financeMode = await loadTenantFinanceMode(tenantId);
    await assertSplitFinanceSoDForUser(tenantId, profile.userId, input.primaryRole, financeMode);

    const started = await workflowService.startWorkflow({
      workflowType: 'staff_role_change',
      tenantId,
      requestedById: actor.userId,
      requestedByRole: actor.role,
      subjectType: 'staff_profile',
      subjectId: staffProfileId,
      title: `Role change request for staff ${staffProfileId}`,
      payload: {
        staffProfileId,
        primaryRole: input.primaryRole,
        replacementStaffProfileId: input.replacementStaffProfileId ?? null,
        singletonOverrideConfirmed: input.singletonOverrideConfirmed ?? false,
      },
    });

    return {
      workflowInstanceId: started.workflowInstanceId,
      workflowType: 'staff_role_change',
    };
  },

  async applyApprovedStaffRoleChange(
    tenantId: string,
    staffProfileId: string,
    input: ChangeStaffRoleRequest,
    approvedById: string,
  ): Promise<StaffProfileResponse> {
    return this.finalizePrimaryRoleChange(tenantId, staffProfileId, input, approvedById);
  },

  async finalizePrimaryRoleChange(
    tenantId: string,
    staffProfileId: string,
    input: ChangeStaffRoleRequest,
    approvedById: string,
  ): Promise<StaffProfileResponse> {
    const profile = await this.requireActiveProfile(tenantId, staffProfileId);
    if (profile.userId === approvedById) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Staff cannot approve their own role change');
    }

    const financeMode = await loadTenantFinanceMode(tenantId);
    await assertSplitFinanceSoDForUser(tenantId, profile.userId, input.primaryRole, financeMode);

    const activeRoles = await staffRepository.listActiveRoles(tenantId, staffProfileId);
    const currentPrimary = activeRoles.find((assignment) => assignment.assignmentType === 'primary');
    if (currentPrimary?.role === input.primaryRole) {
      return serializeProfile(profile, activeRoles);
    }

    if (SINGLETON_ROLES.has(currentPrimary?.role as StaffPrimaryRole)) {
      const vacatedRole = currentPrimary!.role as StaffPrimaryRole;
      const backups = await staffRepository.listActiveBackupDesignations(tenantId, staffProfileId);
      if (
        backups.length === 0 &&
        !input.replacementStaffProfileId &&
        !input.singletonOverrideConfirmed
      ) {
        throw new LoomisError(
          'HRM_SINGLETON_ROLE_GUARD',
          409,
          'Choose a replacement or confirm leaving this role vacant',
        );
      }

      if (input.replacementStaffProfileId) {
        if (input.replacementStaffProfileId === staffProfileId) {
          throw new LoomisError(
            'HRM_ROLE_CONFLICT',
            409,
            'Replacement must be a different staff member',
          );
        }
        const replacementProfile = await this.requireActiveProfile(
          tenantId,
          input.replacementStaffProfileId,
        );
        await assertSplitFinanceSoDForUser(
          tenantId,
          replacementProfile.userId,
          vacatedRole,
          financeMode,
        );
        const replacementChange = await staffRepository.replacePrimaryRole({
          tenantId,
          staffProfileId: input.replacementStaffProfileId,
          newRole: vacatedRole,
          approvedById,
        });
        await staffAccountService.updateStaffRole(replacementProfile.userId, vacatedRole);
        await hrmEvents.publishStaffRoleChanged({
          userId: replacementProfile.userId,
          tenantId,
          previousRole: replacementChange.previous?.role ?? '',
          newRole: vacatedRole,
          changedAt: replacementChange.next.effectiveFrom.toISOString(),
        });
      }
    }

    const replacement = await staffRepository.replacePrimaryRole({
      tenantId,
      staffProfileId,
      newRole: input.primaryRole,
      approvedById,
    });

    await staffAccountService.updateStaffRole(profile.userId, input.primaryRole);
    await hrmEvents.publishStaffRoleChanged({
      userId: profile.userId,
      tenantId,
      previousRole: replacement.previous?.role ?? '',
      newRole: input.primaryRole,
      changedAt: replacement.next.effectiveFrom.toISOString(),
    });

    const roles = await staffRepository.listActiveRoles(tenantId, staffProfileId);
    return serializeProfile(profile, roles);
  },

  async createSubjectAssignment(
    tenantId: string,
    input: CreateSubjectAssignmentInput,
    actor: ActorContext,
  ): Promise<SubjectAssignmentResponse> {
    requireTenant(actor, tenantId);
    const profile = await this.requireActiveProfile(tenantId, input.staffProfileId);
    const roles = await staffRepository.listActiveRoles(tenantId, profile.id);
    const canTeach = roles.some((assignment) =>
      ['teacher', 'class_teacher'].includes(assignment.role),
    );
    if (!canTeach) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Only teachers can receive subject assignments');
    }

    const existing = await staffRepository.findActiveSubjectAssignment({ tenantId, ...input });
    if (existing) {
      throw new LoomisError('HRM_SUBJECT_ASSIGNMENT_CONFLICT', 409, 'Subject assignment already exists');
    }

    const assignment = await staffRepository.createSubjectAssignment({
      tenantId,
      ...input,
      actorUserId: actor.userId,
      approvedById: actor.userId,
    });
    return serializeSubjectAssignment(assignment);
  },

  async removeSubjectAssignment(
    tenantId: string,
    assignmentId: string,
    input: { reason: string },
    actor: ActorContext,
  ): Promise<SubjectAssignmentResponse> {
    requireTenant(actor, tenantId);
    const assignment = await staffRepository.removeSubjectAssignment(
      tenantId,
      assignmentId,
      actor.userId,
      input.reason,
    );
    if (!assignment) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Subject assignment not found');
    }
    return serializeSubjectAssignment(assignment);
  },

  async assignClassTeacher(
    tenantId: string,
    input: AssignClassTeacherRequest,
    actor: ActorContext,
  ): Promise<ClassTeacherAssignmentResponse> {
    requireTenant(actor, tenantId);
    const profile = await this.requireActiveProfile(tenantId, input.staffProfileId);
    const roles = await staffRepository.listActiveRoles(tenantId, profile.id);
    const isTeacher = roles.some((assignment) =>
      ['teacher', 'class_teacher'].includes(assignment.role),
    );
    if (!isTeacher) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Only teachers can be class teachers');
    }

    const existingForStaff = await staffRepository.findActiveClassTeacherForStaffTerm(
      tenantId,
      input.staffProfileId,
      input.termId,
    );
    if (existingForStaff && existingForStaff.classArmId !== input.classArmId) {
      throw new LoomisError(
        'HRM_CLASS_TEACHER_CONFLICT',
        409,
        'A teacher can be Class Teacher for only one class arm per term',
      );
    }

    const existingForArm = await staffRepository.findActiveClassTeacherForArm(
      tenantId,
      input.termId,
      input.classArmId,
    );
    await staffRepository.addClassTeacherExtension(tenantId, input.staffProfileId, actor.userId);
    const replacementId =
      existingForArm && existingForArm.staffProfileId !== input.staffProfileId
        ? existingForArm.id
        : undefined;
    const assignment = await staffRepository.assignClassTeacher({
      tenantId,
      ...input,
      actorUserId: actor.userId,
      ...(replacementId !== undefined ? { replacedAssignmentId: replacementId } : {}),
    });
    return serializeClassTeacherAssignment(assignment);
  },

  async designateBackup(
    tenantId: string,
    input: DesignateBackupRequest,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    if (input.primaryStaffProfileId === input.backupStaffProfileId) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'A staff member cannot back up themselves');
    }
    const primary = await this.requireActiveProfile(tenantId, input.primaryStaffProfileId);
    const backup = await this.requireActiveProfile(tenantId, input.backupStaffProfileId);
    const primaryRoles = await staffRepository.listActiveRoles(tenantId, primary.id);
    const backupRoles = await staffRepository.listActiveRoles(tenantId, backup.id);
    if (!primaryRoles.some((assignment) => assignment.role === input.role)) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Primary staff does not hold this role');
    }
    if (!backupRoles.some((assignment) => assignment.role === input.role)) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Backup staff must hold the backup role');
    }
    return staffRepository.createBackupDesignation({
      tenantId,
      primaryStaffProfileId: input.primaryStaffProfileId,
      backupStaffProfileId: input.backupStaffProfileId,
      role: input.role,
      approvedById: actor.userId,
    });
  },

  async deactivateStaff(
    tenantId: string,
    staffProfileId: string,
    input: DeactivateStaffInput,
    actor: ActorContext,
  ): Promise<StaffProfileResponse> {
    requireTenant(actor, tenantId);
    const profile = await this.requireActiveProfile(tenantId, staffProfileId);
    if (profile.userId === actor.userId) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Staff cannot deactivate themselves');
    }

    const roles = await staffRepository.listActiveRoles(tenantId, staffProfileId);
    const hasSingletonRole = roles.some((assignment) =>
      SINGLETON_ROLES.has(assignment.role as StaffPrimaryRole),
    );
    const classTeacherAssignments = await staffRepository.listActiveClassTeacherAssignments(
      tenantId,
      staffProfileId,
    );
    if (
      (hasSingletonRole || classTeacherAssignments.length > 0) &&
      !input.singletonOverrideConfirmed &&
      !input.replacementStaffProfileId
    ) {
      throw new LoomisError(
        'HRM_SINGLETON_ROLE_GUARD',
        409,
        'Confirm a replacement/deputy before deactivating this staff member',
      );
    }

    if (input.replacementStaffProfileId) {
      await this.requireActiveProfile(tenantId, input.replacementStaffProfileId);
    }

    const deactivated = await staffRepository.deactivateProfile({
      tenantId,
      staffProfileId,
      actorUserId: actor.userId,
      reason: input.reason,
    });
    if (!deactivated) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
    }

    await hrmEvents.publishStaffDeactivated({
      userId: profile.userId,
      tenantId,
      deactivatedAt: deactivated.deactivatedAt?.toISOString() ?? new Date().toISOString(),
    });

    return serializeProfile(deactivated, []);
  },

  async reactivateStaff(
    tenantId: string,
    staffProfileId: string,
    actor: ActorContext,
  ): Promise<StaffProfileResponse> {
    requireTenant(actor, tenantId);
    const profile = await this.requireProfile(tenantId, staffProfileId);
    if (profile.status !== 'deactivated') {
      throw new LoomisError('HRM_STAFF_NOT_ACTIVE', 409, 'Staff profile is not deactivated');
    }
    const reactivated = await staffRepository.reactivateProfile({
      tenantId,
      staffProfileId,
      actorUserId: actor.userId,
    });
    if (!reactivated) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
    }
    return serializeProfile(reactivated, []);
  },

  async requireProfile(tenantId: string, staffProfileId: string) {
    const profile = await staffRepository.findProfileById(tenantId, staffProfileId);
    if (!profile) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
    }
    return profile;
  },

  async setPhoto(
    tenantId: string,
    staffProfileId: string,
    input: SetPhotoRequest,
    actor: ActorContext,
  ): Promise<StaffProfileResponse> {
    requireTenant(actor, tenantId);
    await this.requireActiveProfile(tenantId, staffProfileId);
    const updated = await staffRepository.setPhoto(tenantId, staffProfileId, input.storageObjectId);
    if (!updated) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
    }
    const roles = await staffRepository.listActiveRoles(tenantId, staffProfileId);
    const row = await staffRepository.findProfileWithUserPhoto(tenantId, staffProfileId);
    if (!row) {
      throw new LoomisError('HRM_STAFF_NOT_FOUND', 404, 'Staff profile not found');
    }
    return serializeProfile(row.profile, roles, row.userPhotoStorageObjectId);
  },

  async requireActiveProfile(tenantId: string, staffProfileId: string) {
    const profile = await this.requireProfile(tenantId, staffProfileId);
    if (profile.status !== 'active') {
      throw new LoomisError('HRM_STAFF_NOT_ACTIVE', 409, 'Staff profile is not active');
    }
    return profile;
  },
};
