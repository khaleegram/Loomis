import { createHash, randomBytes } from 'node:crypto';
import type {
  AssignClassTeacherRequest,
  ChangeStaffRoleRequest,
  ClassTeacherAssignmentResponse,
  DesignateBackupRequest,
  StaffInvitationResponse,
  StaffPrimaryRole,
  StaffProfileResponse,
  SubjectAssignmentResponse,
} from '@loomis/contracts';
import { staffAccountService } from '../../identity/services/staff-account.service.js';
import { LoomisError } from '../../../shared/errors.js';
import { hrmEvents } from '../events/index.js';
import { staffRepository } from '../repository/staff.repository.js';
import type {
  ActorContext,
  CreateSubjectAssignmentInput,
  DeactivateStaffInput,
  InviteStaffInput,
} from '../types.js';

const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;
const SINGLETON_ROLES = new Set<StaffPrimaryRole>(['accountant', 'exam_officer']);

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
    });

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

  async listStaff(tenantId: string, actor: ActorContext): Promise<StaffProfileResponse[]> {
    requireTenant(actor, tenantId);
    const profiles = await staffRepository.listProfiles(tenantId);
    const responses: StaffProfileResponse[] = [];
    for (const profile of profiles) {
      const roles = await staffRepository.listActiveRoles(tenantId, profile.id);
      responses.push(serializeProfile(profile, roles));
    }
    return responses;
  },

  async getStaff(
    tenantId: string,
    staffProfileId: string,
    actor: ActorContext,
  ): Promise<StaffProfileResponse> {
    requireTenant(actor, tenantId);
    const profile = await this.requireProfile(tenantId, staffProfileId);
    const roles = await staffRepository.listActiveRoles(tenantId, profile.id);
    return serializeProfile(profile, roles);
  },

  async changePrimaryRole(
    tenantId: string,
    staffProfileId: string,
    input: ChangeStaffRoleRequest,
    actor: ActorContext,
  ): Promise<StaffProfileResponse> {
    requireTenant(actor, tenantId);
    const profile = await this.requireActiveProfile(tenantId, staffProfileId);
    if (profile.userId === actor.userId) {
      throw new LoomisError('HRM_ROLE_CONFLICT', 409, 'Staff cannot approve their own role change');
    }

    const activeRoles = await staffRepository.listActiveRoles(tenantId, staffProfileId);
    const currentPrimary = activeRoles.find((assignment) => assignment.assignmentType === 'primary');
    if (currentPrimary?.role === input.primaryRole) {
      return serializeProfile(profile, activeRoles);
    }

    if (SINGLETON_ROLES.has(currentPrimary?.role as StaffPrimaryRole)) {
      const backups = await staffRepository.listActiveBackupDesignations(tenantId, staffProfileId);
      if (backups.length === 0) {
        throw new LoomisError(
          'HRM_SINGLETON_ROLE_GUARD',
          409,
          'Assign a replacement or backup before changing this singleton role',
        );
      }
    }

    const replacement = await staffRepository.replacePrimaryRole({
      tenantId,
      staffProfileId,
      newRole: input.primaryRole,
      approvedById: actor.userId,
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

  async requireActiveProfile(tenantId: string, staffProfileId: string) {
    const profile = await this.requireProfile(tenantId, staffProfileId);
    if (profile.status !== 'active') {
      throw new LoomisError('HRM_STAFF_NOT_ACTIVE', 409, 'Staff profile is not active');
    }
    return profile;
  },
};
