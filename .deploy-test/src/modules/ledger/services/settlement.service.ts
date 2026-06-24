import { LEDGER_EVENT_TYPES } from '@loomis/contracts';
import { FINANCE_EVENT_TYPES } from '../../finance/events/types.js';
import type { PaymentVerifiedPayload } from '../../finance/events/types.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { LoomisError } from '../../../shared/errors.js';
import type { PaymentVerifiedEvent } from '../events/types.js';
import {
  ledgerOutboxRepository,
  obligationRepository,
  processedEventsRepository,
  settlementRepository,
} from '../repository/index.js';
import { ledgerService } from './ledger.service.js';

function mapSettlementSource(channel: string):
  | 'GATEWAY_SPLIT'
  | 'OFFLINE_CASH'
  | 'BANK_TRANSFER'
  | 'MANUAL_ADJUSTMENT' {
  if (channel === 'online') return 'GATEWAY_SPLIT';
  if (channel === 'offline') return 'OFFLINE_CASH';
  return 'MANUAL_ADJUSTMENT';
}

export const settlementService = {
  /**
   * Consumes `payment.verified` (System Design §8.1). Applies a PSF settlement
   * against the student's obligation for the term and posts clearing entries.
   */
  async handlePaymentVerified(event: PaymentVerifiedEvent): Promise<void> {
    const payload = event.payload as PaymentVerifiedPayload;
    const { tenantId, paymentId, studentId, termId, amountMinor, channel, verifiedById, verifiedAt } =
      payload;

    const idempotencyKey = `payment-verified:${paymentId}`;

    await withTenantContext(tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        FINANCE_EVENT_TYPES.paymentVerified,
      );
      if (!claimed) return;

      const existing = await settlementRepository.findByIdempotencyKey(tx, idempotencyKey);
      if (existing) return;

      const obligation = await obligationRepository.findByStudentTermForUpdate(
        tx,
        tenantId,
        studentId,
        termId,
      );
      if (!obligation) {
        throw new LoomisError(
          'LEDGER_PSF_OBLIGATION_NOT_FOUND',
          422,
          'No PSF obligation exists for this student in this term; enroll before verifying payment',
          { studentId, termId },
        );
      }

      const settledSoFar = await settlementRepository.sumVerifiedForObligation(tx, obligation.id);
      const remaining = obligation.amountMinor - settledSoFar;
      if (remaining <= 0) return;

      const settlementAmountMinor = Math.min(amountMinor, remaining);
      const settlement = await settlementRepository.create(tx, {
        tenantId,
        psfObligationId: obligation.id,
        paymentId,
        settlementAmountMinor,
        settlementSource: mapSettlementSource(channel),
        verifiedBy: verifiedById,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
        idempotencyKey,
      });

      await ledgerService.postSettlement(tx, {
        tenantId,
        settlementId: settlement.id,
        amountMinor: settlementAmountMinor,
      });

      const totalSettled = settledSoFar + settlementAmountMinor;
      if (totalSettled >= obligation.amountMinor) {
        await ledgerOutboxRepository.append(tx, {
          aggregateType: 'psf_obligation',
          aggregateId: obligation.id,
          eventType: LEDGER_EVENT_TYPES.psfObligationSettled,
          tenantId,
          payload: {
            tenantId,
            termId,
            studentId,
            obligationId: obligation.id,
            paymentId,
            settledAmountMinor: totalSettled,
            settledAt: verifiedAt,
          },
        });
      }
    });
  },
};
