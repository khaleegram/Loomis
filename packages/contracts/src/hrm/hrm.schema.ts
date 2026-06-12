import { z } from 'zod';
import { emailDeliveryResult } from '../comms/comms.schema.js';
import { role } from '../common/roles.js';

/**
 * HRM module contracts (SRS §4.14 FR-HRM-001..008; US-HRM-001..009).
 * Shared by API request validation and clients.
 */

export const staffProfileStatus = z.enum(['pending', 'active', 'deactivated']);
export type StaffProfileStatus = z.infer<typeof staffProfileStatus>;

export const staffPrimaryRole = z.enum([
  'principal',
  'admin_officer',
  'accountant',
  'cashier',
  'exam_officer',
  'deputy_exam_officer',
  'timetable_officer',
  'teacher',
]);
export type StaffPrimaryRole = z.infer<typeof staffPrimaryRole>;

export const staffRole = role.extract([
  'school_owner',
  'principal',
  'admin_officer',
  'accountant',
  'cashier',
  'exam_officer',
  'deputy_exam_officer',
  'timetable_officer',
  'teacher',
  'class_teacher',
]);
export type StaffRole = z.infer<typeof staffRole>;

export const roleAssignmentType = z.enum(['primary', 'extension', 'backup', 'deputy']);
export type RoleAssignmentType = z.infer<typeof roleAssignmentType>;

export const inviteStaffRequest = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  primaryRole: staffPrimaryRole,
});
export type InviteStaffRequest = z.infer<typeof inviteStaffRequest>;

/** US-HRM-001. Add staff with a temporary password (replaces invitation flow). */
export const createStaffRequest = inviteStaffRequest.extend({
  /** Optional — auto-generated if omitted. Shown once in the response. */
  temporaryPassword: z.string().min(8).max(128).optional(),
});
export type CreateStaffRequest = z.infer<typeof createStaffRequest>;

export const acceptStaffInvitationRequest = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
});
export type AcceptStaffInvitationRequest = z.infer<typeof acceptStaffInvitationRequest>;

export const changeStaffRoleRequest = z.object({
  primaryRole: staffPrimaryRole,
  /** Promote another staff member into the vacated singleton role. */
  replacementStaffProfileId: z.string().uuid().optional(),
  /** Acknowledge leaving accountant / exam_officer uncovered (no active holder). */
  singletonOverrideConfirmed: z.boolean().default(false),
});
export type ChangeStaffRoleRequest = z.infer<typeof changeStaffRoleRequest>;

export const createSubjectAssignmentRequest = z.object({
  staffProfileId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
});
export type CreateSubjectAssignmentRequest = z.infer<typeof createSubjectAssignmentRequest>;

export const removeSubjectAssignmentRequest = z.object({
  reason: z.string().min(3).max(500),
});
export type RemoveSubjectAssignmentRequest = z.infer<typeof removeSubjectAssignmentRequest>;

export const assignClassTeacherRequest = z.object({
  staffProfileId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
});
export type AssignClassTeacherRequest = z.infer<typeof assignClassTeacherRequest>;

export const designateBackupRequest = z.object({
  primaryStaffProfileId: z.string().uuid(),
  backupStaffProfileId: z.string().uuid(),
  role: z.enum(['accountant', 'cashier', 'exam_officer']),
});
export type DesignateBackupRequest = z.infer<typeof designateBackupRequest>;

export const deactivateStaffRequest = z.object({
  reason: z.string().min(3).max(500),
  singletonOverrideConfirmed: z.boolean().default(false),
  replacementStaffProfileId: z.string().uuid().optional(),
});
export type DeactivateStaffRequest = z.infer<typeof deactivateStaffRequest>;

export const reactivateStaffRequest = z.object({
  reason: z.string().min(3).max(500),
});
export type ReactivateStaffRequest = z.infer<typeof reactivateStaffRequest>;

export const staffProfileResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  status: staffProfileStatus,
  primaryRole: staffPrimaryRole.nullable(),
  roleExtensions: z.array(staffRole),
  joinedAt: z.string().datetime().nullable(),
  deactivatedAt: z.string().datetime().nullable(),
  photoStorageObjectId: z.string().uuid().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StaffProfileResponse = z.infer<typeof staffProfileResponse>;

export const createStaffResponse = z.object({
  profile: staffProfileResponse,
  loginEmail: z.string().email(),
  temporaryPassword: z.string(),
  credentialsEmail: emailDeliveryResult,
});
export type CreateStaffResponse = z.infer<typeof createStaffResponse>;

/** Lightweight invitation summary for pending staff in directory listings. */
export const staffPendingInvitationSummary = z.object({
  id: z.string().uuid(),
  expiresAt: z.string().datetime(),
  isExpired: z.boolean(),
});
export type StaffPendingInvitationSummary = z.infer<typeof staffPendingInvitationSummary>;

export const staffDirectoryEntryResponse = staffProfileResponse.extend({
  pendingInvitation: staffPendingInvitationSummary.nullable().optional(),
});
export type StaffDirectoryEntryResponse = z.infer<typeof staffDirectoryEntryResponse>;

export const staffDirectoryResponse = z.object({
  staff: z.array(staffDirectoryEntryResponse),
});
export type StaffDirectoryResponse = z.infer<typeof staffDirectoryResponse>;

export const staffInvitationResponse = z.object({
  id: z.string().uuid(),
  staffProfileId: z.string().uuid(),
  email: z.string().email(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  isExpired: z.boolean(),
});
export type StaffInvitationResponse = z.infer<typeof staffInvitationResponse>;

export const subjectAssignmentResponse = z.object({
  id: z.string().uuid(),
  staffProfileId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  active: z.boolean(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable(),
});
export type SubjectAssignmentResponse = z.infer<typeof subjectAssignmentResponse>;

export const classTeacherAssignmentResponse = z.object({
  id: z.string().uuid(),
  staffProfileId: z.string().uuid(),
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  active: z.boolean(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().nullable(),
});
export type ClassTeacherAssignmentResponse = z.infer<typeof classTeacherAssignmentResponse>;

export const staffDetailResponse = staffProfileResponse.extend({
  pendingInvitation: staffInvitationResponse.nullable(),
  subjectAssignments: z.array(subjectAssignmentResponse),
  classTeacherAssignments: z.array(classTeacherAssignmentResponse),
});
export type StaffDetailResponse = z.infer<typeof staffDetailResponse>;

export const resendStaffInvitationResponse = z.object({
  status: z.literal('resent'),
  expiresAt: z.string().datetime(),
});
export type ResendStaffInvitationResponse = z.infer<typeof resendStaffInvitationResponse>;

export const setPhotoRequest = z.object({
  storageObjectId: z.string().uuid(),
});
export type SetPhotoRequest = z.infer<typeof setPhotoRequest>;
