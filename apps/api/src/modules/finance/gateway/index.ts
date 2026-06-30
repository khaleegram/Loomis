import type { PaymentGatewayProvider } from '@loomis/contracts';
import { nombaGateway } from './nomba.gateway.js';
import { paystackGateway } from './paystack.gateway.js';
import type { PaymentGateway } from './types.js';

export type {
  InitializePaymentInput,
  InitializePaymentResult,
  GatewaySettlementRecord,
  ParsedWebhookEvent,
  PaymentGateway,
  VerifyTransactionResult,
} from './types.js';

export { createNombaVirtualAccount } from './nomba.gateway.js';
export type { CreateNombaVirtualAccountInput, CreateNombaVirtualAccountResult } from './nomba.gateway.js';
export { isNombaConfigured } from './nomba.client.js';

/** Gateway Abstraction Layer — Paystack checkout + Nomba virtual accounts. */
export const gatewayAbstractionLayer = {
  get(provider: PaymentGatewayProvider): PaymentGateway {
    if (provider === 'nomba') return nombaGateway;
    return paystackGateway;
  },

  priorityOrder(): PaymentGatewayProvider[] {
    return ['nomba', 'paystack'];
  },
};
