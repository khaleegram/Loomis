import type { PaymentGatewayProvider } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { flutterwaveGateway } from './flutterwave.gateway.js';
import { paystackGateway } from './paystack.gateway.js';
import type { PaymentGateway } from './types.js';

export type {
  InitializePaymentInput,
  InitializePaymentResult,
  ParsedWebhookEvent,
  PaymentGateway,
} from './types.js';

const gateways: Record<PaymentGatewayProvider, PaymentGateway> = {
  paystack: paystackGateway,
  flutterwave: flutterwaveGateway,
};

/** Gateway Abstraction Layer (System Design §9.1). */
export const gatewayAbstractionLayer = {
  get(provider: PaymentGatewayProvider): PaymentGateway {
    const gateway = gateways[provider];
    if (!gateway) {
      throw new LoomisError('FINANCE_GATEWAY_NOT_CONFIGURED', 503, `Unknown gateway: ${provider}`);
    }
    return gateway;
  },

  /** Primary gateway order for failover (Paystack → Flutterwave). */
  priorityOrder(): PaymentGatewayProvider[] {
    return ['paystack', 'flutterwave'];
  },
};
