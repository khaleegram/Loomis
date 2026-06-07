import { uuidv7 } from 'uuidv7';
import type { PaymentGatewayProvider } from '@loomis/contracts';

import { dispatchEvent } from '../../../shared/events/registry.js';
import { FINANCE_EVENT_TYPES } from '../events/types.js';
import { gatewayAbstractionLayer } from '../gateway/index.js';
import { paymentRepository } from '../repository/index.js';
import { paymentService } from './payment.service.js';

/**
 * Inbound gateway webhook pipeline (System Design §9.2; SEC-WH-001..003):
 * 1. Verify HMAC signature FIRST
 * 2. Idempotent upsert on (provider, provider_event_id)
 * 3. Enqueue processing via outbox (`payment.webhook.received`)
 */
export const webhookService = {
  async ingest(
    provider: PaymentGatewayProvider,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): Promise<{ status: 'accepted' | 'duplicate' | 'rejected' }> {
    const gateway = gatewayAbstractionLayer.get(provider);
    const signatureValid = gateway.verifyWebhookSignature(headers, rawBody);

    if (!signatureValid) {
      // Return 200 to prevent gateway retry storms (System Design §9.2) but never process.
      await paymentRepository.upsertWebhookEvent({
        id: uuidv7(),
        provider,
        providerEventId: `invalid:${uuidv7()}`,
        eventType: 'signature_invalid',
        signatureValid: false,
        payload: { note: 'signature verification failed' },
        providerTimestamp: null,
        tenantId: null,
        paymentId: null,
      });
      return { status: 'rejected' };
    }

    const parsed = gateway.parseWebhookEvent(rawBody);

    if (!paymentService.isWebhookTimestampValid(parsed.providerTimestamp)) {
      await paymentRepository.upsertWebhookEvent({
        id: uuidv7(),
        provider,
        providerEventId: parsed.providerEventId,
        eventType: parsed.eventType,
        signatureValid: true,
        payload: parsed.raw,
        providerTimestamp: parsed.providerTimestamp,
        tenantId: parsed.tenantId,
        paymentId: parsed.paymentId,
      });
      return { status: 'rejected' };
    }

    const webhookEventId = uuidv7();
    const { isDuplicate } = await paymentRepository.upsertWebhookEvent({
      id: webhookEventId,
      provider,
      providerEventId: parsed.providerEventId,
      eventType: parsed.eventType,
      signatureValid: true,
      payload: parsed.raw,
      providerTimestamp: parsed.providerTimestamp,
      tenantId: parsed.tenantId,
      paymentId: parsed.paymentId,
      outboxEvent: {
        aggregateType: 'webhook_event',
        aggregateId: webhookEventId,
        eventType: FINANCE_EVENT_TYPES.paymentWebhookReceived,
        tenantId: parsed.tenantId,
        payload: {
          webhookEventId,
          provider,
          providerEventId: parsed.providerEventId,
          tenantId: parsed.tenantId,
          paymentId: parsed.paymentId,
          gatewayReference: parsed.gatewayReference,
          status: parsed.status,
        },
      },
    });

    if (isDuplicate) {
      return { status: 'duplicate' };
    }

    // In-process dispatch until the BullMQ outbox relay ships (Ledger module).
    await dispatchEvent(FINANCE_EVENT_TYPES.paymentWebhookReceived, {
      event_id: webhookEventId,
      payload: {
        webhookEventId,
        provider,
        providerEventId: parsed.providerEventId,
        tenantId: parsed.tenantId,
        paymentId: parsed.paymentId,
        gatewayReference: parsed.gatewayReference,
      },
    });

    return { status: 'accepted' };
  },
};
