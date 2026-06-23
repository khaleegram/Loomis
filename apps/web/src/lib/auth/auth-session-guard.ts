/** True while the initial session descriptor + refresh bootstrap is in flight. */
let authBootstrapping = true;

export function setAuthBootstrapping(value: boolean): void {
  authBootstrapping = value;
}

export function isAuthBootstrapping(): boolean {
  return authBootstrapping;
}

/**
 * Hard redirect to login on invalidated API sessions — suppressed during bootstrap
 * and when already on an auth page (avoids /login ↔ /school reload loops).
 */
export function handleSessionInvalidated(redirect: () => void): void {
  if (authBootstrapping) return;
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path === '/login' || path.startsWith('/mfa') || path === '/change-password') return;
  redirect();
}
