import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentGatewayProvider } from '@loomis/contracts';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import type {
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentGateway,
} from './types.js';

const PAYSTACK_API = 'https://api.paystack.co';

function requirePaystackSecret(): string {
  const secret = getEnv().PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new LoomisError(
      'FINANCE_GATEWAY_NOT_CONFIGURED',
      503,
      'PAYSTACK_SECRET_KEY is not configured — add sandbox keys to .env.local',
    );
  }
  return secret;
}

function requirePaystackWebhookSecret(): string {
  const secret = getEnv().PAYSTACK_WEBHOOK_SECRET ?? getEnv().PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new LoomisError(
      'FINANCE_GATEWAY_NOT_CONFIGURED',
      503,
      'PAYSTACK_WEBHOOK_SECRET (or PAYSTACK_SECRET_KEY) is not configured',
    );
  }
  return secret;
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export const paystackGateway: PaymentGateway = {
  provider: 'paystack' satisfies PaymentGatewayProvider,

  verifyWebhookSignature(headers, rawBody) {
    const signature = headerValue(headers, 'x-paystack-signature');
    if (!signature) return false;
    const secret = requirePaystackWebhookSecret();
    const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch {
      return false;
    }
  },

  parseWebhookEvent(rawBody) {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;
    const eventType = String(payload.event ?? 'unknown');
    const providerEventId = String(data.id ?? payload.id ?? `${eventType}:${data.reference ?? 'unknown'}`);
    const paidAt = typeof data.paid_at === 'string' ? new Date(data.paid_at) : null;
    const amountMinor =
      typeof data.amount === 'number' ? data.amount : Number(data.amount ?? Number.NaN);
    const status =
      data.status === 'success' ? 'success' : data.status === 'failed' ? 'failed' : 'unknown';

    return {
      providerEventId,
      eventType,
      providerTimestamp: paidAt,
      gatewayReference: typeof data.reference === 'string' ? data.reference : null,
      amountMinor: Number.isFinite(amountMinor) ? amountMinor : null,
      status,
      tenantId: typeof metadata.tenant_id === 'string' ? metadata.tenant_id : null,
      paymentId: typeof metadata.payment_id === 'string' ? metadata.payment_id : null,
      raw: payload,
    };
  },

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const secret = requirePaystackSecret();
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.payerEmail,
        amount: input.amountMinor,
        reference: input.reference,
        callback_url: input.redirectUrl,
        metadata: input.metadata,
      }),
    });

    const body = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!response.ok || !body.status || !body.data?.authorization_url) {
      throw new LoomisError(
        'FINANCE_ONLINE_PAYMENT_INIT_FAILED',
        502,
        body.message ?? 'Paystack payment initialization failed',
      );
    }

    return {
      authorizationUrl: body.data.authorization_url,
      gatewayReference: body.data.reference ?? input.reference,
    };
  },

  async verifyTransaction(reference: string) {
    const secret = requirePaystackSecret();
    const response = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );

    const body = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        amount?: number;
        reference?: string;
      };
    };

    if (!response.ok || !body.status || !body.data) {
      throw new LoomisError(
        'FINANCE_GATEWAY_UNAVAILABLE',
        502,
        body.message ?? 'Paystack transaction verification failed',
      );
    }

    const amountMinor =
      typeof body.data.amount === 'number' ? body.data.amount : Number(body.data.amount ?? Number.NaN);
    const status =
      body.data.status === 'success'
        ? 'success'
        : body.data.status === 'failed'
          ? 'failed'
          : 'pending';

    return {
      gatewayReference: body.data.reference ?? reference,
      amountMinor: Number.isFinite(amountMinor) ? amountMinor : null,
      status,
    };
  },

  async fetchSuccessfulTransactions(fromDate: string, toDate: string) {
    const secret = requirePaystackSecret();
    const records: import('./types.js').GatewaySettlementRecord[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${PAYSTACK_API}/transaction`);
      url.searchParams.set('from', fromDate);
      url.searchParams.set('to', toDate);
      url.searchParams.set('status', 'success');
      url.searchParams.set('perPage', '100');
      url.searchParams.set('page', String(page));

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${secret}` },
      });

      const body = (await response.json()) as {
        status?: boolean;
        message?: string;
        data?: Array<{
          reference?: string;
          amount?: number;
          paid_at?: string;
        }>;
        meta?: { nextPage?: number | null; pageCount?: number };
      };

      if (!response.ok || !body.status) {
        throw new LoomisError(
          'FINANCE_GATEWAY_RECONCILIATION_FAILED',
          502,
          body.message ?? 'Paystack transaction fetch failed during reconciliation',
        );
      }

      for (const txn of body.data ?? []) {
        if (typeof txn.reference !== 'string' || typeof txn.amount !== 'number') continue;
        const settledAt = typeof txn.paid_at === 'string' ? txn.paid_at.slice(0, 10) : fromDate;
        records.push({
          gatewayReference: txn.reference,
          amountMinor: txn.amount,
          settledAt,
        });
      }

      const nextPage = body.meta?.nextPage;
      if (nextPage && nextPage > page) {
        page = nextPage;
      } else {
        hasMore = false;
      }
    }

    return records;
  },
};
