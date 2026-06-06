import { timingSafeEqual } from 'node:crypto';
import type { PaymentGatewayProvider } from '@loomis/contracts';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import type {
  InitializePaymentInput,
  InitializePaymentResult,
  ParsedWebhookEvent,
  PaymentGateway,
} from './types.js';

const FLUTTERWAVE_API = 'https://api.flutterwave.com/v3';

function requireFlutterwaveSecret(): string {
  const secret = getEnv().FLUTTERWAVE_SECRET_KEY;
  if (!secret) {
    throw new LoomisError(
      'FINANCE_GATEWAY_NOT_CONFIGURED',
      503,
      'FLUTTERWAVE_SECRET_KEY is not configured — add sandbox keys to .env.local',
    );
  }
  return secret;
}

function requireFlutterwaveWebhookSecret(): string {
  const secret = getEnv().FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret) {
    throw new LoomisError(
      'FINANCE_GATEWAY_NOT_CONFIGURED',
      503,
      'FLUTTERWAVE_WEBHOOK_SECRET is not configured — add sandbox keys to .env.local',
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

export const flutterwaveGateway: PaymentGateway = {
  provider: 'flutterwave' satisfies PaymentGatewayProvider,

  verifyWebhookSignature(headers, _rawBody) {
    const verifHash = headerValue(headers, 'verif-hash');
    if (!verifHash) return false;
    const secret = requireFlutterwaveWebhookSecret();
    try {
      return timingSafeEqual(Buffer.from(verifHash), Buffer.from(secret));
    } catch {
      return false;
    }
  },

  parseWebhookEvent(rawBody) {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const meta = (data.meta ?? {}) as Record<string, unknown>;
    const eventType = String(payload.event ?? data.status ?? 'unknown');
    const providerEventId = String(data.id ?? payload.id ?? data.tx_ref ?? 'unknown');
    const createdAt = typeof data.created_at === 'string' ? new Date(data.created_at) : null;
    const amountMajor = Number(data.amount ?? Number.NaN);
    const amountMinor = Number.isFinite(amountMajor) ? Math.round(amountMajor * 100) : null;
    const status =
      data.status === 'successful' ? 'success' : data.status === 'failed' ? 'failed' : 'unknown';

    return {
      providerEventId,
      eventType,
      providerTimestamp: createdAt,
      gatewayReference: typeof data.tx_ref === 'string' ? data.tx_ref : null,
      amountMinor,
      status,
      tenantId: typeof meta.tenant_id === 'string' ? meta.tenant_id : null,
      paymentId: typeof meta.payment_id === 'string' ? meta.payment_id : null,
      raw: payload,
    };
  },

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const secret = requireFlutterwaveSecret();
    const amountNaira = input.amountMinor / 100;
    const response = await fetch(`${FLUTTERWAVE_API}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: amountNaira,
        currency: 'NGN',
        redirect_url: input.redirectUrl,
        customer: { email: input.payerEmail },
        meta: input.metadata,
      }),
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { link?: string };
    };

    if (!response.ok || body.status !== 'success' || !body.data?.link) {
      throw new LoomisError(
        'FINANCE_ONLINE_PAYMENT_INIT_FAILED',
        502,
        body.message ?? 'Flutterwave payment initialization failed',
      );
    }

    return {
      authorizationUrl: body.data.link,
      gatewayReference: input.reference,
    };
  },
};
