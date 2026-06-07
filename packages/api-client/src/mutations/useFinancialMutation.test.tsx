// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../http/client.js';
import { ApiClientProvider } from '../query/context.js';
import { useFinancialMutation } from './useFinancialMutation.js';

function createWrapper(client: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

describe('useFinancialMutation', () => {
  it('generates one idempotency key on mount and keeps it across submits', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    const client: ApiClient = {
      request: vi.fn(),
      get: vi.fn(),
      post,
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const { result, rerender } = renderHook(
      () =>
        useFinancialMutation<{ amountMinor: number }, { ok: boolean }>({
          endpoint: '/tenants/t1/payments/offline',
          action: 'refund_approve',
          invalidates: [],
          ensureStepUpToken: vi.fn().mockResolvedValue({
            mfaToken: 'mfa-token',
            expiresAt: new Date(Date.now() + 300_000).toISOString(),
          }),
        }),
      { wrapper: createWrapper(client) },
    );

    const firstKey = result.current.idempotencyKey;
    expect(firstKey).toBeTruthy();

    await result.current.mutateFinancialAsync({ amountMinor: 100_000 });
    rerender();
    expect(result.current.idempotencyKey).toBe(firstKey);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(post.mock.calls[0]?.[2]?.idempotencyKey).toBe(firstKey);
  });

  it('regenerates the idempotency key only when explicitly reset', () => {
    const client: ApiClient = {
      request: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const { result, rerender } = renderHook(
      () =>
        useFinancialMutation({
          endpoint: '/tenants/t1/payments/offline',
          action: 'census_lock',
          invalidates: [],
          ensureStepUpToken: vi.fn(),
        }),
      { wrapper: createWrapper(client) },
    );

    const originalKey = result.current.idempotencyKey;
    result.current.regenerateIdempotencyKey();
    rerender();
    expect(result.current.idempotencyKey).not.toBe(originalKey);
  });
});
