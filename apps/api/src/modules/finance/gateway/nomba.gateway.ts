import type { PaymentGatewayProvider } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import {
  createNombaVirtualAccount,
  getNombaAccessToken,
  isNombaConfigured,
  parseNombaWebhookEvent,
  resolveNombaConfig,
  verifyNombaWebhookSignature,
  type CreateNombaVirtualAccountInput,
  type CreateNombaVirtualAccountResult,
} from './nomba.client.js';
import type {
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentGateway,
} from './types.js';

export type { CreateNombaVirtualAccountInput, CreateNombaVirtualAccountResult };

export const nombaGateway: PaymentGateway = {
  provider: 'nomba' satisfies PaymentGatewayProvider,

  verifyWebhookSignature(headers, rawBody) {
    if (!isNombaConfigured()) return false;
    try {
      return verifyNombaWebhookSignature(headers, rawBody);
    } catch {
      return false;
    }
  },

  parseWebhookEvent(rawBody) {
    return parseNombaWebhookEvent(rawBody);
  },

  async initializePayment(_input: InitializePaymentInput): Promise<InitializePaymentResult> {
    throw new LoomisError(
      'VALIDATION_ERROR',
      400,
      'Nomba fee collection uses persistent virtual accounts — use GET /parents/me/student-virtual-account',
    );
  },

  async verifyTransaction(reference: string) {
    const config = resolveNombaConfig();
    const token = await getNombaAccessToken();
    const url = new URL(`${config.baseUrl}/v1/transactions/accounts/single`);
    url.searchParams.set('transactionRef', reference);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        accountId: config.parentAccountId,
      },
    });

    const body = (await response.json()) as {
      code?: string;
      data?: { amount?: number; status?: string; transactionRef?: string };
    };

    if (!response.ok || body.code !== '00' || !body.data) {
      throw new LoomisError(
        'FINANCE_GATEWAY_UNAVAILABLE',
        502,
        'Nomba transaction verification failed',
      );
    }

    const amountRaw = Number(body.data.amount ?? Number.NaN);
    const amountMinor = Number.isFinite(amountRaw) ? Math.round(amountRaw * 100) : null;
    const status =
      body.data.status === 'success'
        ? 'success'
        : body.data.status === 'failed'
          ? 'failed'
          : 'pending';

    return {
      gatewayReference: body.data.transactionRef ?? reference,
      amountMinor,
      status,
    };
  },

  async fetchSuccessfulTransactions() {
    return [];
  },
};

export { createNombaVirtualAccount };
