import {
  loginResponse,
  mfaEnrollConfirmResponse,
  mfaEnrollStartResponse,
  passwordResetResponse,
  type LoginRequest,
  type LoginResponse,
  type MfaEnrollConfirmRequest,
  type MfaEnrollConfirmResponse,
  type MfaEnrollStartResponse,
  type MfaVerifyRequest,
  type PasswordResetConfirmRequest,
  type PasswordResetRequest,
  type PasswordResetResponse,
  type ChangePasswordRequest,
  type Role,
} from '@loomis/contracts';

import { deviceTrustHeaders, storeDeviceTrustToken } from '@/lib/auth/device-trust';

/**
 * Browser-side client for the BFF auth routes (Frontend Architecture §7.3).
 * Talks ONLY to same-origin `/api/auth/*`. Never receives or stores the refresh
 * token (httpOnly cookie) and never persists the access token (memory only).
 */

export interface AuthenticatedSession {
  accessToken: string;
  expiresAt: string;
  role: Role;
  tenantId: string | null;
  mustChangePassword?: boolean;
  displayName?: string;
}

export class AuthError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

function toAuthError(status: number, json: unknown): AuthError {
  const error = (json as { error?: { code?: string; message?: string } } | null)?.error;
  return new AuthError(
    error?.code ?? 'AUTH_ERROR',
    error?.message ?? 'Authentication request failed',
    status,
  );
}

async function postJson(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
}

function capturePersistentToken(json: unknown): void {
  const token = (json as { persistentToken?: unknown } | null)?.persistentToken;
  if (typeof token === 'string' && token.length > 0) {
    storeDeviceTrustToken(token);
  }
}

function toAuthenticatedSession(data: {
  accessToken: string;
  expiresAt: string;
  role: Role;
  tenantId: string | null;
  mustChangePassword?: boolean;
  displayName?: string;
}): AuthenticatedSession {
  return {
    accessToken: data.accessToken,
    expiresAt: data.expiresAt,
    role: data.role,
    tenantId: data.tenantId,
    ...(data.mustChangePassword ? { mustChangePassword: true } : {}),
    ...(data.displayName ? { displayName: data.displayName } : {}),
  };
}

/** Step 1 of login: password. May resolve to an authenticated session or an MFA step. */
export async function login(input: LoginRequest): Promise<LoginResponse> {
  const res = await postJson('/api/auth/login', input, deviceTrustHeaders());
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);
  capturePersistentToken(json);
  const parsed = loginResponse.safeParse(json);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed login response', 500);
  return parsed.data;
}

/** Step 2 of login: SMS or TOTP. Resolves to an authenticated session. */
export async function verifyMfa(input: MfaVerifyRequest): Promise<AuthenticatedSession> {
  const res = await postJson('/api/auth/mfa/verify', input, deviceTrustHeaders());
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);
  capturePersistentToken(json);
  const parsed = loginResponse.safeParse(json);
  if (!parsed.success || parsed.data.outcome !== 'authenticated') {
    throw new AuthError('INTERNAL_ERROR', 'Malformed MFA verification response', 500);
  }
  const { accessToken, expiresAt, role, tenantId, mustChangePassword, displayName } = parsed.data;
  return toAuthenticatedSession({ accessToken, expiresAt, role, tenantId, mustChangePassword, displayName });
}

/** Begin TOTP enrollment using the enrollment token returned by login. */
export async function startMfaEnrollment(
  enrollmentToken: string,
): Promise<MfaEnrollStartResponse> {
  const res = await fetch('/api/auth/mfa/enroll', {
    method: 'GET',
    headers: { Authorization: `Bearer ${enrollmentToken}` },
    credentials: 'same-origin',
  });
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const data = (json as { data?: unknown } | null)?.data ?? json;
  const parsed = mfaEnrollStartResponse.safeParse(data);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed enrollment response', 500);
  return parsed.data;
}

/** Confirm the first TOTP and receive one-time backup codes. */
export async function confirmMfaEnrollment(
  input: MfaEnrollConfirmRequest,
): Promise<MfaEnrollConfirmResponse> {
  const res = await postJson('/api/auth/mfa/enroll', input);
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const data = (json as { data?: unknown } | null)?.data ?? json;
  const parsed = mfaEnrollConfirmResponse.safeParse(data);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed enrollment response', 500);
  return parsed.data;
}

/** Request a password-reset OTP (US-XC-003). */
export async function requestPasswordReset(
  input: PasswordResetRequest,
): Promise<PasswordResetResponse> {
  const res = await postJson('/api/auth/password/reset', input);
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const data = (json as { data?: unknown } | null)?.data ?? json;
  const parsed = passwordResetResponse.safeParse(data);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed reset response', 500);
  return parsed.data;
}

/** Confirm the OTP and set a new password (US-XC-003). */
export async function confirmPasswordReset(
  input: PasswordResetConfirmRequest,
): Promise<void> {
  const res = await postJson('/api/auth/password/reset/confirm', input);
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);
}

/** Exchange the httpOnly refresh cookie for a fresh in-memory access token. */
export async function refresh(): Promise<AuthenticatedSession | null> {
  const res = await postJson('/api/auth/refresh', {});
  if (res.status === 401) return null;
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const parsed = loginResponse.safeParse(json);
  if (!parsed.success || parsed.data.outcome !== 'authenticated') {
    throw new AuthError('INTERNAL_ERROR', 'Malformed refresh response', 500);
  }
  const { accessToken, expiresAt, role, tenantId, mustChangePassword, displayName } = parsed.data;
  return toAuthenticatedSession({ accessToken, expiresAt, role, tenantId, mustChangePassword, displayName });
}

/** Change password after logging in with a provisioned temporary password. */
export async function changePassword(input: ChangePasswordRequest): Promise<AuthenticatedSession> {
  const { memoryTokenStore } = await import('@/lib/auth/memory-token-store');
  const token = memoryTokenStore.getAccessToken();
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'same-origin',
    body: JSON.stringify({ newPassword: input.newPassword }),
  });
  const json = await readJson(res);
  if (!res.ok) throw toAuthError(res.status, json);

  const next = await refresh();
  if (!next) {
    throw new AuthError('IDENTITY_SESSION_INVALIDATED', 'Session expired after password change', 401);
  }
  return next;
}

/** Revoke the session and clear auth cookies. */
export async function logout(allDevices = false): Promise<void> {
  await postJson('/api/auth/logout', { allDevices });
}
