import { LEDGER_EVENT_TYPES } from '@loomis/contracts';
import { ACADEMIC_EVENT_TYPES } from '../../academic/events/types.js';
import type { TermCensusLockedPayload } from '../../academic/events/types.js';
import { enrollmentService } from '../../student/services/enrollment.service.js';
import { psfRateService } from '../../tenant/services/psf-rate.service.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { LoomisError } from '../../../shared/errors.js';
import type { CensusLockedEvent } from '../events/types.js';
import {
  ledgerOutboxRepository,
  obligationRepository,
  processedEventsRepository,
} from '../repository/index.js';
import { ledgerService } from './ledger.service.js';

export const obligationService = {
  /**
   * Consumes `academic.term.census_locked` (System Design §8.1). Creates one PSF
   * obligation per billable enrollment plus balanced ledger postings. Idempotent
   * via processed_events and the unique (tenant, term, student) constraint.
   */
  async handleCensusLocked(event: CensusLockedEvent): Promise<void> {
    const payload = event.payload as TermCensusLockedPayload;
    const { tenantId, termId, psfRateMinor } = payload;

    if (psfRateMinor <= 0) {
      throw new LoomisError('LEDGER_PSF_RATE_ZERO_BLOCKED', 422, 'PSF rate must be greater than zero (CON-006)');
    }

    const snapshot = await psfRateService.ensureBillingSnapshot(tenantId, psfRateMinor);
    const studentIds = await enrollmentService.listBillableStudentIdsForTerm(tenantId, termId);

    await withTenantContext(tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        ACADEMIC_EVENT_TYPES.termCensusLocked,
      );
      if (!claimed) return;

      for (const studentId of studentIds) {
        const obligation = await obligationRepository.create(tx, {
          tenantId,
          termId,
          studentId,
          rateSnapshotId: snapshot.id,
          amountMinor: psfRateMinor,
          liabilityReason: 'census_locked',
        });

        await ledgerService.postObligationCreated(tx, {
          tenantId,
          obligationId: obligation.id,
          amountMinor: psfRateMinor,
        });

        await ledgerOutboxRepository.append(tx, {
          aggregateType: 'psf_obligation',
          aggregateId: obligation.id,
          eventType: LEDGER_EVENT_TYPES.psfObligationCreated,
          tenantId,
          payload: {
            tenantId,
            termId,
            studentId,
            obligationId: obligation.id,
            amountMinor: psfRateMinor,
            rateSnapshotId: snapshot.id,
            liabilityReason: 'census_locked',
          },
        });
      }
    });
  },
};
