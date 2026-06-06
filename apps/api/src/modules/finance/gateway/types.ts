import type { PaymentGatewayProvider } from '@loomis/contracts';

export interface InitializePaymentInput {
  reference: string;
  amountMinor: number;
  payerEmail: string;
  metadata: Record<string, string>;
  redirectUrl: string;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  gatewayReference: string;
}

export interface ParsedWebhookEvent {
  providerEventId: string;
  eventType: string;
  providerTimestamp: Date | null;
  gatewayReference: string | null;
  amountMinor: number | null;
  status: 'success' | 'failed' | 'unknown';
  tenantId: string | null;
  paymentId: string | null;
  raw: Record<string, unknown>;
}

export interface PaymentGateway {
  readonly provider: PaymentGatewayProvider;
  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean;
  parseWebhookEvent(rawBody: string): ParsedWebhookEvent;
  initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult>;
}
