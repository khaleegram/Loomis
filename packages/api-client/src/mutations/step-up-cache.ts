import type { StepUpAction } from '@loomis/contracts';

interface CachedStepUp {
  mfaToken: string;
  expiresAtMs: number;
}

const cache = new Map<StepUpAction, CachedStepUp>();

/** Returns a cached step-up token when still valid (>5 min window from server). */
export function getCachedStepUpToken(action: StepUpAction): string | null {
  const entry = cache.get(action);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAtMs) {
    cache.delete(action);
    return null;
  }
  return entry.mfaToken;
}

export function setCachedStepUpToken(
  action: StepUpAction,
  mfaToken: string,
  expiresAt: string,
): void {
  cache.set(action, { mfaToken, expiresAtMs: new Date(expiresAt).getTime() });
}

/** Clears cached step-up proofs (e.g. on logout). */
export function clearStepUpCache(): void {
  cache.clear();
}

/** Test-only reset. */
export function _resetStepUpCacheForTests(): void {
  cache.clear();
}
