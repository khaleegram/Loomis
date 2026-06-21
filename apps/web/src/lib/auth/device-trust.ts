const FINGERPRINT_KEY = 'loomis_device_fingerprint';
const TRUST_TOKEN_KEY = 'loomis_device_trust_token';

/** Stable browser fingerprint for trusted-device MFA (SEC-AUTH-014). */
export function getOrCreateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = crypto.randomUUID();
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

export function getStoredDeviceTrustToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TRUST_TOKEN_KEY);
}

export function storeDeviceTrustToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TRUST_TOKEN_KEY, token);
}

export function clearDeviceTrustToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TRUST_TOKEN_KEY);
}

/** Headers forwarded by the BFF to the API for login / MFA verify. */
export function deviceTrustHeaders(): Record<string, string> {
  const fingerprint = getOrCreateDeviceFingerprint();
  const token = getStoredDeviceTrustToken();
  const headers: Record<string, string> = {
    'X-Device-Fingerprint': fingerprint,
  };
  if (token) {
    headers['X-Device-Token'] = token;
  }
  return headers;
}
