import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../http/client.js';
import { LoomisClientError } from '../http/errors.js';
import { executeFinancialMutation } from './financial-mutation.js';
import { _resetStepUpCacheForTests } from './step-up-cache.js';

afterEach(() => {
  _resetStepUpCacheForTests();
  vi.restoreAllMocks();
});

function createMockClient(handlers: {
  post?: ApiClient['post'];
}): ApiClient {
  return {
    request: vi.fn(),
    get: vi.fn(),
    post: handlers.post ?? vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

describe('executeFinancialMutation', () => {
  it('attaches idempotency key and step-up MFA token', async () => {
    const post = vi.fn().mockResolvedValue({ paymentId: 'pay-1' });
    const client = createMockClient({ post });
    const ensureStepUpToken = vi.fn().mockResolvedValue({
      mfaToken: 'stepup-token',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    });

    const result = await executeFinancialMutation({
      client,
      endpoint: '/tenants/t1/payments/offline',
      action: 'refund_approve',
      idempotencyKey: 'idem-stable',
      ensureStepUpToken,
      body: { amountMinor: 100_000 },
    });

    expect(result).toEqual({ paymentId: 'pay-1' });
    expect(ensureStepUpToken).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith(
      '/tenants/t1/payments/offline',
      { amountMinor: 100_000 },
      { idempotencyKey: 'idem-stable', mfaToken: 'stepup-token' },
    );
  });

  it('reuses cached step-up token without calling ensureStepUpToken again', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    const client = createMockClient({ post });
    const ensureStepUpToken = vi.fn().mockResolvedValue({
      mfaToken: 'cached-token',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    });

    await executeFinancialMutation({
      client,
      endpoint: '/tenants/t1/payments/offline',
      action: 'refund_approve',
      idempotencyKey: 'idem-1',
      ensureStepUpToken,
      body: {},
    });

    await executeFinancialMutation({
      client,
      endpoint: '/tenants/t1/payments/offline',
      action: 'refund_approve',
      idempotencyKey: 'idem-2',
      ensureStepUpToken,
      body: {},
    });

    expect(ensureStepUpToken).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1]?.[2]).toMatchObject({ mfaToken: 'cached-token' });
  });

  it('treats 409 idempotency replay as success', async () => {
    const replayError = new LoomisClientError(409, {
      code: 'FINANCE_PAYMENT_DUPLICATE',
      message: 'Already processed',
      requestId: 'req-replay',
      details: {
        idempotencyReplay: true,
        originalResult: { paymentId: 'pay-original' },
      },
    });

    const post = vi.fn().mockRejectedValue(replayError);
    const client = createMockClient({ post });

    const result = await executeFinancialMutation({
      client,
      endpoint: '/tenants/t1/payments/offline',
      action: 'refund_approve',
      idempotencyKey: 'idem-replay',
      ensureStepUpToken: vi.fn().mockResolvedValue({
        mfaToken: 'mfa-1',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      }),
      body: { amountMinor: 50_000 },
    });

    expect(result).toEqual({ paymentId: 'pay-original' });
  });
});
