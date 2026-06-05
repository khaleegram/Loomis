import { z } from 'zod';
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

export const acceptStaffInvitationRequest = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
});
export type AcceptStaffInvitationRequest = z.infer<typeof acceptStaffInvitationRequest>;

export const changeStaffRoleRequest = z.object({
  primaryRole: staffPrimaryRole,
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StaffProfileResponse = z.infer<typeof staffProfileResponse>;

export const staffDirectoryResponse = z.object({
  staff: z.array(staffProfileResponse),
});
export type StaffDirectoryResponse = z.infer<typeof staffDirectoryResponse>;

export const staffInvitationResponse = z.object({
  id: z.string().uuid(),
  staffProfileId: z.string().uuid(),
  email: z.string().email(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
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
