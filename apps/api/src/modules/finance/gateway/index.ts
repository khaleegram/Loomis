import type { PaymentGatewayProvider } from '@loomis/contracts';
import { paystackGateway } from './paystack.gateway.js';
import type { PaymentGateway } from './types.js';

export type {
  InitializePaymentInput,
  InitializePaymentResult,
  ParsedWebhookEvent,
  PaymentGateway,
} from './types.js';

/** Gateway Abstraction Layer — Paystack only (System Design §9.1). */
export const gatewayAbstractionLayer = {
  get(_provider: PaymentGatewayProvider): PaymentGateway {
    return paystackGateway;
  },

  priorityOrder(): PaymentGatewayProvider[] {
    return ['paystack'];
  },
};
