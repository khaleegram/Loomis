import type { PaymentVerifiedEvent } from '../types.js';
import { settlementService } from '../../services/settlement.service.js';

/** Consumes `payment.verified` → PSF settlement + clearing ledger postings. */
export async function handlePaymentVerified(event: PaymentVerifiedEvent): Promise<void> {
  await settlementService.handlePaymentVerified(event);
}
