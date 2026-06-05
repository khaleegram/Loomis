import type { Role } from '@loomis/contracts';

/** Platform adapters injected by web and mobile (Frontend Architecture §3.2). */
export interface TokenStore {
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  /** Web: no-op (refresh token is in an httpOnly cookie). Mobile: SecureStore. */
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string | null): Promise<void>;
}

export interface DeviceInfo {
  deviceId: string | null;
  platform: 'web' | 'ios' | 'android';
  fingerprint: string;
}

export interface ApiClientConfig {
  baseUrl: string;
  tokenStore: TokenStore;
  deviceInfo: () => DeviceInfo;
  /** Web: redirect to /login. Mobile: reset nav stack, preserve offline queue. */
  onSessionInvalidated: () => void;
  /** Returns the active tenant id for the X-Tenant-Id header, or null. */
  getActiveTenantId: () => string | null;
  fetchFn?: typeof fetch;
}

export interface AuthSession {
  role: Role;
  tenantId: string | null;
}
