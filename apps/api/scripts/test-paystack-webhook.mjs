/**
 * Sends a signed Paystack charge.success webhook to the local API or ngrok URL.
 * Usage (from repo root):
 *   node --env-file=.env.local apps/api/scripts/test-paystack-webhook.mjs
 *   node --env-file=.env.local apps/api/scripts/test-paystack-webhook.mjs --url https://YOUR.ngrok-free.app/api/v1/webhooks/paystack
 */
import { createHmac } from 'node:crypto';

const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY;
if (!secret) {
  console.error('Missing PAYSTACK_SECRET_KEY in .env.local');
  process.exit(1);
}

const urlFlagIdx = process.argv.indexOf('--url');
const urlArg = process.argv.find((a) => a.startsWith('--url='));
const target =
  urlArg?.slice('--url='.length) ??
  (urlFlagIdx >= 0 ? process.argv[urlFlagIdx + 1] : undefined) ??
  'http://localhost:18080/api/v1/webhooks/paystack';

const payload = {
  event: 'charge.success',
  data: {
    id: 999_001,
    reference: process.env.TEST_PAYMENT_ID ?? '00000000-0000-7000-8000-000000000001',
    amount: 100_000,
    status: 'success',
    paid_at: new Date().toISOString(),
    metadata: {
      tenant_id: process.env.TEST_TENANT_ID ?? '00000000-0000-7000-8000-000000000002',
      payment_id: process.env.TEST_PAYMENT_ID ?? '00000000-0000-7000-8000-000000000001',
    },
  },
};

const rawBody = JSON.stringify(payload);
const signature = createHmac('sha512', secret).update(rawBody).digest('hex');

console.log(`POST ${target}`);
const res = await fetch(target, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': signature,
  },
  body: rawBody,
});

const text = await res.text();
console.log(`Status: ${res.status}`);
console.log(text);
