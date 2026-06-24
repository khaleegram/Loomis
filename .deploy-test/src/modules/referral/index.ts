import type { FastifyInstance } from 'fastify';
import { registerReferralEventConsumers } from './events/index.js';
import { attributionsRoutes } from './routes/attributions.routes.js';
import { codesRoutes } from './routes/codes.routes.js';
import { earningsRoutes } from './routes/earnings.routes.js';
import { kycRoutes } from './routes/kyc.routes.js';
import { participantsRoutes } from './routes/participants.routes.js';
import { payoutCyclesRoutes } from './routes/payout-cycles.routes.js';

/**
 * Referral module plugin (SRS §4.13 FR-REF-001..007; System Design §3.2 Referral).
 * KYC-gated referral programme with HMAC code storage, PSF-settlement earnings,
 * 40% per-tenant payout cap, and IVP earnings holds.
 */
export async function referralModule(app: FastifyInstance): Promise<void> {
  registerReferralEventConsumers();
  await app.register(participantsRoutes);
  await app.register(kycRoutes);
  await app.register(codesRoutes);
  await app.register(attributionsRoutes);
  await app.register(earningsRoutes);
  await app.register(payoutCyclesRoutes);
}

export {
  attributionService,
  codeService,
  earningService,
  kycService,
  participantService,
  payoutService,
} from './services/index.js';
