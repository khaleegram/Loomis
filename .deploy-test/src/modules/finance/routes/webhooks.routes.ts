import type { FastifyInstance, FastifyRequest } from 'fastify';
import { paymentGatewayProvider } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { gatewayWebhookHandler } from '../handlers/webhook.handler.js';

/**
 * Inbound payment gateway webhooks (System Design §9.2; SEC-WH-001..003).
 * No JWT auth — HMAC verification happens in the service layer FIRST.
 * Raw body is preserved for signature checks.
 */
export async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req: FastifyRequest, body: string, done) => {
      if (req.url.includes('/webhooks/')) {
        req.rawBody = body;
      }
      try {
        const parsed = body.length > 0 ? JSON.parse(body) : {};
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post(
    '/webhooks/:provider',
    {
      preValidation: [
        async (req) => {
          const parsed = paymentGatewayProvider.safeParse(req.params.provider);
          if (!parsed.success) {
            throw new LoomisError('VALIDATION_ERROR', 400, 'Unknown payment gateway provider');
          }
        },
      ],
    },
    gatewayWebhookHandler,
  );
}
