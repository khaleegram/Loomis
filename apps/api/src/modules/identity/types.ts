import type { Role } from '@loomis/contracts';

export type UserStatus = 'pending' | 'active' | 'locked' | 'deactivated';

export type MfaStatus = 'pending' | 'active';

export type DevicePlatform = 'ios' | 'android' | 'web';

export type PasswordResetChannel = 'email' | 'phone';

export type SessionRevokeReason =
  | 'user_logout'
  | 'user_revoke'
  | 'password_change'
  | 'role_change'
  | 'deactivation'
  | 'mfa_reset'
  | 'concurrent_limit'
  | 'idle_timeout'
  | 'absolute_timeout'
  | 'token_replay'
  | 'admin_revoke';

/** Roles that require MFA enrollment before any access (SEC-AUTH-002, SEC-AUTH-003). */
export const MFA_MANDATORY_ROLES: ReadonlySet<Role> = new Set<Role>([
  'platform_owner',
  'platform_admin',
  'dpo',
  'regional_manager',
  'regional_subordinate',
  'school_owner',
  'principal',
  'accountant',
  'admin_officer',
  'exam_officer',
]);

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  tenantId: string | null;
  sessionId: string;
  userVer: number;
  mfaAt?: number;
  deviceId?: string | null;
}

export interface VerifiedAccessToken extends AccessTokenPayload {
  jti: string;
  iat: number;
  exp: number;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: Role;
  tenantId: string | null;
  mfaRequired: boolean;
  status?: UserStatus;
  phone?: string;
}

export interface CreateSessionInput {
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  platform?: DevicePlatform;
  idleExpiresAt: Date;
  absExpiresAt: Date;
}

export interface CreateRefreshTokenInput {
  userId: string;
  sessionId: string;
  deviceId?: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

export interface CreateDeviceInput {
  userId: string;
  deviceFingerprintHash: string;
  platform: DevicePlatform;
  persistentTokenHash?: string;
  persistentTokenExpiresAt?: Date;
}

export interface CreateMfaConfigInput {
  userId: string;
  encryptedSecret: string;
  status: MfaStatus;
}

export interface CreateLoginAttemptInput {
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
}

export interface CreatePasswordResetOtpInput {
  userId: string;
  otpHash: string;
  channel: PasswordResetChannel;
  expiresAt: Date;
}
