import { z } from 'zod';

/**
 * SEC-AUTH-001: minimum eight characters with complexity requirements.
 * At least one uppercase, one lowercase, one digit, and one special character.
 */
export const passwordComplexity = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

/** Admin-provisioned temporary password (min length only; complexity not required). */
export const provisionedPassword = z.string().min(8).max(128);
export type ProvisionedPassword = z.infer<typeof provisionedPassword>;

export type PasswordComplexity = z.infer<typeof passwordComplexity>;

/** `currentPassword` is omitted on first-login setup when the session already proves identity. */
export const changePasswordRequest = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: passwordComplexity,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequest>;

export const changePasswordResponse = z.object({
  mustChangePassword: z.literal(false),
});
export type ChangePasswordResponse = z.infer<typeof changePasswordResponse>;

export const passwordResetRequest = z.object({
  email: z.string().email(),
});
export type PasswordResetRequest = z.infer<typeof passwordResetRequest>;

export const passwordResetConfirmRequest = z.object({
  otpId: z.string().uuid(),
  otp: z.string().length(6),
  newPassword: passwordComplexity,
});
export type PasswordResetConfirmRequest = z.infer<typeof passwordResetConfirmRequest>;

export const passwordResetResponse = z.object({
  otpId: z.string().uuid(),
  channel: z.enum(['email', 'phone']),
  expiresAt: z.string().datetime(),
});
export type PasswordResetResponse = z.infer<typeof passwordResetResponse>;

/** Updates the authenticated user's display name and/or email. */
export const updateProfileRequest = z.object({
  displayName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  photoStorageObjectId: z.string().uuid().nullable().optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequest>;

export const updateProfileResponse = z.object({
  displayName: z.string().nullable(),
  email: z.string(),
  photoStorageObjectId: z.string().uuid().nullable(),
});
export type UpdateProfileResponse = z.infer<typeof updateProfileResponse>;

export const myProfileResponse = z.object({
  userId: z.string().uuid(),
  displayName: z.string().nullable(),
  email: z.string(),
  photoStorageObjectId: z.string().uuid().nullable(),
  role: z.string(),
  tenantId: z.string().uuid().nullable(),
});
export type MyProfileResponse = z.infer<typeof myProfileResponse>;
