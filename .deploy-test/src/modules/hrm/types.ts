import type {
  CreateSubjectAssignmentRequest,
  CreateStaffRequest,
  DeactivateStaffRequest,
  InviteStaffRequest,
  RoleAssignmentType,
  StaffPrimaryRole,
  StaffRole,
} from '@loomis/contracts';

export interface ActorContext {
  userId: string;
  role: string;
  tenantId: string | null;
}

export type InviteStaffInput = InviteStaffRequest;
export type CreateStaffInput = CreateStaffRequest;
export type CreateSubjectAssignmentInput = CreateSubjectAssignmentRequest;
export type DeactivateStaffInput = DeactivateStaffRequest;

export interface CreateStaffProfileInput {
  tenantId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  createdById: string;
}

export interface CreateRoleAssignmentInput {
  tenantId: string;
  staffProfileId: string;
  role: StaffRole;
  assignmentType: RoleAssignmentType;
  primaryStaffProfileId?: string | null;
  approvedById: string;
}

export interface CreateInvitationInput {
  tenantId: string;
  staffProfileId: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  invitedById: string;
}

export interface CriticalRoleGuard {
  role: StaffPrimaryRole | 'class_teacher';
  classArmId?: string;
  termId?: string;
}
