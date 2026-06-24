import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PaymentGatewayProvider } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { webhookService } from '../services/webhook.service.js';

interface WebhookParams {
  provider: PaymentGatewayProvider;
}

export async function gatewayWebhookHandler(
  req: FastifyRequest<{ Params: WebhookParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rawBody =
    typeof req.rawBody === 'string'
      ? req.rawBody
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {});

  const result = await webhookService.ingest(req.params.provider, req.headers, rawBody);

  if (result.status === 'duplicate') {
    return sendSuccess(reply, { status: 'duplicate' });
  }
  if (result.status === 'rejected') {
    return sendSuccess(reply, { status: 'rejected' });
  }
  return sendSuccess(reply, { status: 'accepted' }, 201);
}
