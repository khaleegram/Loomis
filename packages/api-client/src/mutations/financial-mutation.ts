import type { QueryKey } from '@tanstack/react-query';
import type { StepUpAction } from '@loomis/contracts';
import type { ApiClient } from '../http/client.js';
import { LoomisClientError } from '../http/errors.js';
import { getIdempotencyReplayResult, isIdempotencyReplay } from './idempotency.js';
import { getCachedStepUpToken, setCachedStepUpToken } from './step-up-cache.js';

export type StepUpTokenResult = {
  mfaToken: string;
  expiresAt: string;
};

export interface FinancialMutationConfig<TReq> {
  client: ApiClient;
  endpoint: string;
  method?: 'POST' | 'PATCH';
  action: StepUpAction;
  idempotencyKey: string;
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
  body: TReq;
}

/**
 * Executes a financial/workflow write with idempotency + step-up MFA
 * (Frontend Architecture §6). Separated from the hook for testability.
 */
export async function executeFinancialMutation<TReq, TRes>(
  config: FinancialMutationConfig<TReq>,
): Promise<TRes> {
  const mfaToken = await resolveStepUpToken(config.action, config.ensureStepUpToken);
  const method = config.method ?? 'POST';

  try {
    if (method === 'PATCH') {
      return await config.client.patch<TRes>(config.endpoint, config.body, {
        idempotencyKey: config.idempotencyKey,
        mfaToken,
      });
    }
    return await config.client.post<TRes>(config.endpoint, config.body, {
      idempotencyKey: config.idempotencyKey,
      mfaToken,
    });
  } catch (error) {
    if (isIdempotencyReplay(error)) {
      return getIdempotencyReplayResult<TRes>(error);
    }
    throw error;
  }
}

async function resolveStepUpToken(
  action: StepUpAction,
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>,
): Promise<string> {
  const cached = getCachedStepUpToken(action);
  if (cached) return cached;

  const stepUp = await ensureStepUpToken(action);
  setCachedStepUpToken(action, stepUp.mfaToken, stepUp.expiresAt);
  return stepUp.mfaToken;
}

export type FinancialMutationHookConfig = {
  endpoint: string;
  method?: 'POST' | 'PATCH';
  action: StepUpAction;
  invalidates: QueryKey[];
  ensureStepUpToken: (action: StepUpAction) => Promise<StepUpTokenResult>;
};

/** Maps mutation errors for global handlers (session invalidation, etc.). */
export function isSessionInvalidationError(error: unknown): boolean {
  return error instanceof LoomisClientError && error.isSessionInvalidated;
}
