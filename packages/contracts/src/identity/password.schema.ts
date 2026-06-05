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

export type PasswordComplexity = z.infer<typeof passwordComplexity>;

export const changePasswordRequest = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordComplexity,
});
export type ChangePasswordRequest = z.infer<typeof changePasswordRequest>;

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
