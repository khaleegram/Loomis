import type { TokenStore } from '@loomis/api-client';
import { secureDelete, secureGet, secureSet } from './secure-store.js';

const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_TOKEN_MEMORY: { token: string | null } = { token: null };

export const mobileTokenStore: TokenStore = {
  getAccessToken() {
    return ACCESS_TOKEN_MEMORY.token;
  },
  setAccessToken(token) {
    ACCESS_TOKEN_MEMORY.token = token;
  },
  async getRefreshToken() {
    return secureGet(REFRESH_TOKEN_KEY);
  },
  async setRefreshToken(token) {
    if (token) {
      await secureSet(REFRESH_TOKEN_KEY, token);
    } else {
      await secureDelete(REFRESH_TOKEN_KEY);
    }
  },
};

export function clearAccessTokenMemory(): void {
  ACCESS_TOKEN_MEMORY.token = null;
}
