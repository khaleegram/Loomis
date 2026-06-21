import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Local dev API port — must match `API_PORT` / web `NEXT_PUBLIC_API_BASE_URL`. */
export const MOBILE_API_PORT = 18080;

export const MOBILE_API_BASE = `http://localhost:${MOBILE_API_PORT}/api/v1` as const;

function configuredApiBase(): string {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    MOBILE_API_BASE
  );
}

/** Metro / Expo dev server host (e.g. 192.168.0.101 from exp://192.168.0.101:8085). */
function getMetroLanHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { hostUri?: string } }).manifest?.hostUri;

  if (!hostUri) return null;

  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function rewriteLocalhost(base: string, host: string): string {
  return base.replace('://localhost', `://${host}`).replace('://127.0.0.1', `://${host}`);
}

/**
 * Resolves the API base URL for the current runtime.
 * On a physical device, `localhost` points at the phone — swap in the Metro LAN IP.
 */
export function resolveMobileApiBase(): string {
  const base = configuredApiBase();

  if (!__DEV__) return base;

  const lanHost = getMetroLanHost();
  if (lanHost) return rewriteLocalhost(base, lanHost);

  // Android emulator: host machine is 10.0.2.2 from the emulator's perspective.
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return rewriteLocalhost(base, '10.0.2.2');
  }

  return base;
}
