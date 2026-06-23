'use client';

import { useAuth } from '@/lib/auth/auth-context';

/** Gate TanStack Query hooks until the in-memory access token is available. */
export function useAuthQueryEnabled(): boolean {
  const { status, isTokenReady } = useAuth();
  return status === 'authenticated' && isTokenReady;
}
