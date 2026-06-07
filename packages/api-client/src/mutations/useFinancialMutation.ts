import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { uuidv7 } from 'uuidv7';
import type { StepUpAction } from '@loomis/contracts';
import { useApiClient } from '../query/context.js';
import {
  executeFinancialMutation,
  type FinancialMutationHookConfig,
  type StepUpTokenResult,
} from './financial-mutation.js';

export type UseFinancialMutationConfig = FinancialMutationHookConfig;

/**
 * Financial/workflow mutation wrapper (Frontend Architecture §6).
 * - One idempotency key generated on mount, stable across retries.
 * - Inline step-up MFA via injected `ensureStepUpToken`.
 * - 409 idempotency replay treated as success.
 * - Invalidates listed query keys on success.
 */
export function useFinancialMutation<TReq, TRes>(config: UseFinancialMutationConfig) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef(uuidv7());

  const regenerateIdempotencyKey = useCallback(() => {
    idempotencyKeyRef.current = uuidv7();
  }, []);

  const mutation = useMutation({
    mutationFn: (body: TReq) =>
      executeFinancialMutation<TReq, TRes>({
        client,
        endpoint: config.endpoint,
        ...(config.method !== undefined ? { method: config.method } : {}),
        action: config.action,
        idempotencyKey: idempotencyKeyRef.current,
        ensureStepUpToken: config.ensureStepUpToken,
        body,
      }),
    onSuccess: () => {
      for (const queryKey of config.invalidates) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  return {
    ...mutation,
    /** Stable key for this form instance — regenerate only on a fresh operation. */
    idempotencyKey: idempotencyKeyRef.current,
    regenerateIdempotencyKey,
    /** Alias emphasising submit must stay disabled while in-flight (§6). */
    isSubmitting: mutation.isPending,
    mutateFinancial: mutation.mutate,
    mutateFinancialAsync: mutation.mutateAsync,
  };
}

export type { StepUpAction, StepUpTokenResult, QueryKey };
