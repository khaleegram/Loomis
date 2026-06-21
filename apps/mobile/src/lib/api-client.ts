import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { createApiClient, type ApiClient } from '@loomis/api-client';
import { resolveMobileApiBase } from '../../constants/api.js';
import { mobileTokenStore } from './token-store.js';

export function getApiBase(): string {
  return resolveMobileApiBase();
}

let deviceId: string | null = null;
let activeTenantId: string | null = null;
let onSessionInvalidatedHandler: (() => void) | null = null;

export function setActiveTenantId(tenantId: string | null): void {
  activeTenantId = tenantId;
}

export function getActiveTenantId(): string | null {
  return activeTenantId;
}

export function setOnSessionInvalidated(handler: () => void): void {
  onSessionInvalidatedHandler = handler;
}

export function setDeviceId(id: string): void {
  deviceId = id;
}

export function getDeviceId(): string | null {
  return deviceId;
}

export async function getDeviceFingerprint(): Promise<string> {
  const stored = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Platform.OS}-${Constants.sessionId ?? 'loomis'}`,
  );
  return stored;
}

export function createMobileApiClient(): ApiClient {
  return createApiClient({
    baseUrl: getApiBase(),
    tokenStore: mobileTokenStore,
    deviceInfo: () => ({
      deviceId,
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
      fingerprint: deviceId ?? 'mobile-unknown',
    }),
    getActiveTenantId: () => activeTenantId,
    onSessionInvalidated: () => {
      onSessionInvalidatedHandler?.();
    },
    fetchFn: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set('X-Client-Platform', Platform.OS === 'ios' ? 'ios' : 'android');
      const fingerprint = await getDeviceFingerprint();
      headers.set('X-Device-Fingerprint', fingerprint);
      return fetch(input, { ...init, headers });
    },
  });
}

/** @deprecated Prefer `getApiBase()` — URL is resolved per runtime (LAN IP on device). */
export const API_BASE = getApiBase();
