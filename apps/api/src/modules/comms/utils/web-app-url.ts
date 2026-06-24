import { getEnv } from '../../../config/env.js';

export function webAppBaseUrl(): string {
  const env = getEnv();
  if (env.WEB_APP_BASE_URL) return env.WEB_APP_BASE_URL.replace(/\/$/, '');
  if (env.PAYMENT_REDIRECT_BASE_URL) {
    try {
      const url = new URL(env.PAYMENT_REDIRECT_BASE_URL);
      return url.origin;
    } catch {
      // fall through
    }
  }
  return 'http://localhost:3000';
}

export function loginUrl(): string {
  return `${webAppBaseUrl()}/login`;
}

export function staffInvitationUrl(token: string, tenantId: string): string {
  const params = new URLSearchParams({ token, tenant: tenantId });
  return `${webAppBaseUrl()}/accept-invitation?${params.toString()}`;
}
