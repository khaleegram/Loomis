import {
  loginResponse,
  mfaEnrollConfirmResponse,
  mfaEnrollStartResponse,
  passwordResetResponse,
  type ChangePasswordRequest,
  type LoginRequest,
  type LoginResponse,
  type MfaEnrollConfirmRequest,
  type MfaEnrollConfirmResponse,
  type MfaEnrollStartResponse,
  type MfaVerifyRequest,
  type PasswordResetConfirmRequest,
  type PasswordResetRequest,
  type PasswordResetResponse,
  type Role,
} from '@loomis/contracts';
import { getApiBase, getDeviceFingerprint } from './api-client.js';
import { decodeSessionFromAccessToken } from './jwt-session.js';
import { mobileTokenStore } from './token-store.js';
import { Platform } from 'react-native';

export interface AuthenticatedSession {
  accessToken: string;
  expiresAt: string;
  role: Role;
  tenantId: string | null;
  mustChangePassword?: boolean;
  displayName?: string;
  refreshToken?: string;
  staffExtensionRoles?: Role[];
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

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  headers.set('X-Client-Platform', Platform.OS === 'ios' ? 'ios' : 'android');
  headers.set('X-Device-Fingerprint', await getDeviceFingerprint());
  return fetch(`${getApiBase()}${path}`, { ...init, headers });
}

async function readEnvelope(res: Response): Promise<unknown> {
  const json = await res.json().catch(() => null);
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: unknown }).data;
  }
  return json;
}

function toAuthError(status: number, json: unknown): AuthError {
  const error = (json as { error?: { code?: string; message?: string } } | null)?.error;
  return new AuthError(
    error?.code ?? 'AUTH_ERROR',
    error?.message ?? 'Authentication request failed',
    status,
  );
}

function parseStaffExtensionRoles(value: unknown): Role[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const roles: Role[] = [];
  for (const item of value) {
    if (typeof item === 'string') roles.push(item as Role);
  }
  return roles.length > 0 ? roles : undefined;
}

function toSession(data: Record<string, unknown>): AuthenticatedSession {
  const accessToken = String(data.accessToken);
  const decoded = decodeSessionFromAccessToken(accessToken);

  const role = (decoded?.role ?? data.role) as Role | undefined;
  if (!role) {
    throw new AuthError('INTERNAL_ERROR', 'Session is missing role claim', 500);
  }

  const staffExtensionRoles = parseStaffExtensionRoles(data.staffExtensionRoles);

  return {
    accessToken,
    expiresAt: String(data.expiresAt),
    role,
    tenantId: decoded?.tenantId ?? (data.tenantId as string | null) ?? null,
    ...(data.mustChangePassword ? { mustChangePassword: true } : {}),
    ...(decoded?.displayName
      ? { displayName: decoded.displayName }
      : data.displayName
        ? { displayName: String(data.displayName) }
        : {}),
    ...(data.refreshToken ? { refreshToken: String(data.refreshToken) } : {}),
    ...(staffExtensionRoles ? { staffExtensionRoles } : {}),
  };
}

export async function login(input: LoginRequest): Promise<LoginResponse & { refreshToken?: string }> {
  const res = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const parsed = loginResponse.safeParse(json);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed login response', 500);
  const refreshToken =
    json && typeof json === 'object' && 'refreshToken' in json
      ? String((json as { refreshToken: string }).refreshToken)
      : undefined;
  return { ...parsed.data, ...(refreshToken ? { refreshToken } : {}) };
}

export async function verifyMfa(input: MfaVerifyRequest): Promise<AuthenticatedSession> {
  const res = await authFetch('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
  if (!json || typeof json !== 'object' || (json as { outcome?: string }).outcome !== 'authenticated') {
    throw new AuthError('INTERNAL_ERROR', 'Malformed MFA response', 500);
  }
  return toSession(json as Record<string, unknown>);
}

export async function startMfaEnrollment(enrollmentToken: string): Promise<MfaEnrollStartResponse> {
  const res = await authFetch('/auth/mfa/enroll', {
    method: 'GET',
    headers: { Authorization: `Bearer ${enrollmentToken}` },
  });
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const parsed = mfaEnrollStartResponse.safeParse(json);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed enrollment response', 500);
  return parsed.data;
}

export async function confirmMfaEnrollment(
  input: MfaEnrollConfirmRequest,
  enrollmentToken: string,
): Promise<MfaEnrollConfirmResponse> {
  const res = await authFetch('/auth/mfa/enroll', {
    method: 'POST',
    headers: { Authorization: `Bearer ${enrollmentToken}` },
    body: JSON.stringify(input),
  });
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const parsed = mfaEnrollConfirmResponse.safeParse(json);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed enrollment response', 500);
  return parsed.data;
}

export async function requestPasswordReset(
  input: PasswordResetRequest,
): Promise<PasswordResetResponse> {
  const res = await authFetch('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const parsed = passwordResetResponse.safeParse(json);
  if (!parsed.success) throw new AuthError('INTERNAL_ERROR', 'Malformed reset response', 500);
  return parsed.data;
}

export async function confirmPasswordReset(input: PasswordResetConfirmRequest): Promise<void> {
  const res = await authFetch('/auth/password/reset/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
}

export async function refreshSession(): Promise<AuthenticatedSession | null> {
  const refreshToken = await mobileTokenStore.getRefreshToken();
  if (!refreshToken) return null;
  const res = await authFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  if (res.status === 401) return null;
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
  if (!json || typeof json !== 'object') return null;
  const data = json as Record<string, unknown>;
  try {
    return toSession({
      outcome: 'authenticated',
      role: data.role,
      tenantId: data.tenantId ?? null,
      staffExtensionRoles: data.staffExtensionRoles,
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
      refreshToken: data.refreshToken,
      displayName: data.displayName,
      mustChangePassword: data.mustChangePassword,
    });
  } catch {
    return null;
  }
}

export async function logout(allDevices = false): Promise<void> {
  const refreshToken = await mobileTokenStore.getRefreshToken();
  const accessToken = mobileTokenStore.getAccessToken();
  await authFetch('/auth/logout', {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify({ allDevices, ...(refreshToken ? { refreshToken } : {}) }),
  }).catch(() => undefined);
}

export async function changePassword(input: ChangePasswordRequest): Promise<AuthenticatedSession> {
  const accessToken = mobileTokenStore.getAccessToken();
  const res = await authFetch('/auth/change-password', {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: JSON.stringify(input),
  });
  const json = await readEnvelope(res);
  if (!res.ok) throw toAuthError(res.status, json);
  const next = await refreshSession();
  if (!next) throw new AuthError('IDENTITY_SESSION_INVALIDATED', 'Session expired', 401);
  return next;
}

export async function persistSession(session: AuthenticatedSession): Promise<void> {
  mobileTokenStore.setAccessToken(session.accessToken);
  if (session.refreshToken) {
    await mobileTokenStore.setRefreshToken(session.refreshToken);
  }
}

export async function clearSession(): Promise<void> {
  mobileTokenStore.setAccessToken(null);
  await mobileTokenStore.setRefreshToken(null);
}
