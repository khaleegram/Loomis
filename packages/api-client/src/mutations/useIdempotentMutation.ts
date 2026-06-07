import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { uuidv7 } from 'uuidv7';
import type { ApiClient } from '../http/client.js';
import { useApiClient } from '../query/context.js';
import { getIdempotencyReplayResult, isIdempotencyReplay } from './idempotency.js';

export type IdempotentMutationHookConfig<TReq, TRes> = {
  mutationFn: (client: ApiClient, body: TReq, idempotencyKey: string) => Promise<TRes>;
  invalidates: QueryKey[];
};

/**
 * Workflow writes that require Idempotency-Key but not step-up MFA
 * (Frontend Architecture §6 — idempotency without financial step-up).
 */
export function useIdempotentMutation<TReq, TRes>(config: IdempotentMutationHookConfig<TReq, TRes>) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef(uuidv7());

  const regenerateIdempotencyKey = useCallback(() => {
    idempotencyKeyRef.current = uuidv7();
  }, []);

  const mutation = useMutation({
    mutationFn: async (body: TReq) => {
      try {
        return await config.mutationFn(client, body, idempotencyKeyRef.current);
      } catch (error) {
        if (isIdempotencyReplay(error)) {
          return getIdempotencyReplayResult<TRes>(error);
        }
        throw error;
      }
    },
    onSuccess: () => {
      for (const queryKey of config.invalidates) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  return {
    ...mutation,
    idempotencyKey: idempotencyKeyRef.current,
    regenerateIdempotencyKey,
    isSubmitting: mutation.isPending,
  };
}

export type { QueryKey };
