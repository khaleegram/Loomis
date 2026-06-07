import { getRedis } from '../../../../shared/redis.js';
import { gatewayAbstractionLayer } from '../../gateway/index.js';
import { paymentRepository } from '../../repository/index.js';
import { paymentService } from '../../services/payment.service.js';
import type { PaymentWebhookReceivedPayload } from '../types.js';

const PROCESSED_TTL_SECONDS = 86_400 * 7;

async function markEventProcessed(eventId: string): Promise<boolean> {
  const result = await getRedis().set(
    `finance:processed:${eventId}`,
    '1',
    'EX',
    PROCESSED_TTL_SECONDS,
    'NX',
  );
  return result === 'OK';
}

/**
 * Consumes `payment.webhook.received` from the in-process event registry.
 * Matches the gateway reference to a pending online payment and settles it,
 * publishing `payment.verified` for the Ledger module (CHAT 13).
 */
export async function handlePaymentWebhookReceived(
  event: { event_id: string; payload: PaymentWebhookReceivedPayload },
): Promise<void> {
  const alreadyProcessed = !(await markEventProcessed(event.event_id));
  if (alreadyProcessed) return;

  const payload = event.payload;
  const webhookRow = await paymentRepository.findWebhookEventById(payload.webhookEventId);
  if (!webhookRow || webhookRow.status === 'processed' || webhookRow.status === 'duplicate') {
    return;
  }

  const provider = payload.provider as 'paystack';
  const gateway = gatewayAbstractionLayer.get(provider);
  const parsed = gateway.parseWebhookEvent(JSON.stringify(webhookRow.payload));

  if (parsed.status !== 'success') {
    await paymentRepository.markWebhookProcessed(webhookRow.id);
    return;
  }

  let paymentId = payload.paymentId;
  let tenantId = payload.tenantId;

  if (!paymentId && parsed.gatewayReference) {
    const payment = await paymentRepository.findPaymentByGatewayReference(
      provider,
      parsed.gatewayReference,
    );
    if (payment) {
      paymentId = payment.id;
      tenantId = payment.tenantId;
    }
  }

  if (!paymentId || !tenantId) {
    await paymentRepository.markWebhookProcessed(webhookRow.id);
    return;
  }

  await paymentService.settleOnlinePayment(tenantId, paymentId, webhookRow.id);
}
