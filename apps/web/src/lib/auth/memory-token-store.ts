import type { TokenStore } from '@loomis/api-client';

/**
 * Web access-token store — memory only (Frontend Architecture §7.3).
 * Refresh token is handled by httpOnly cookies via BFF route handlers (CHAT 23).
 */
let accessToken: string | null = null;

export const memoryTokenStore: TokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },

  setAccessToken(token: string | null): void {
    accessToken = token;
  },

  async getRefreshToken(): Promise<string | null> {
    return null;
  },

  async setRefreshToken(): Promise<void> {
    // no-op — refresh token lives in an httpOnly cookie on web
  },
};
