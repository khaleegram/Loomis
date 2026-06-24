import { LEDGER_EVENT_TYPES } from '@loomis/contracts';
import { ACADEMIC_EVENT_TYPES } from '../../academic/events/types.js';
import type { TermCensusLockedPayload } from '../../academic/events/types.js';
import { STUDENT_EVENT_TYPES, type StudentLateEnrolledPayload } from '../../student/events/types.js';
import { enrollmentService } from '../../student/services/enrollment.service.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { LoomisError } from '../../../shared/errors.js';
import type { Executor } from '../../../shared/db.js';
import type { CensusLockedEvent, LateEnrolledEvent } from '../events/types.js';
import {
  ledgerOutboxRepository,
  obligationRepository,
  processedEventsRepository,
} from '../repository/index.js';
import { ledgerService } from './ledger.service.js';
import { psfObligations } from '../../../../drizzle/schema/ledger.js';
import { eq } from 'drizzle-orm';

async function createObligationWithPosting(
  tx: Parameters<typeof obligationRepository.create>[0],
  params: {
    tenantId: string;
    termId: string;
    studentId: string;
    rateSnapshotId: string;
    amountMinor: number;
    liabilityReason: 'census_locked' | 'late_enrollment' | 'platform_adjustment';
  },
) {
  const obligation = await obligationRepository.create(tx, {
    tenantId: params.tenantId,
    termId: params.termId,
    studentId: params.studentId,
    rateSnapshotId: params.rateSnapshotId,
    amountMinor: params.amountMinor,
    liabilityReason: params.liabilityReason,
  });

  await ledgerService.postObligationCreated(tx, {
    tenantId: params.tenantId,
    obligationId: obligation.id,
    amountMinor: params.amountMinor,
  });

  await ledgerOutboxRepository.append(tx, {
    aggregateType: 'psf_obligation',
    aggregateId: obligation.id,
    eventType: LEDGER_EVENT_TYPES.psfObligationCreated,
    tenantId: params.tenantId,
    payload: {
      tenantId: params.tenantId,
      termId: params.termId,
      studentId: params.studentId,
      obligationId: obligation.id,
      amountMinor: params.amountMinor,
      rateSnapshotId: params.rateSnapshotId,
      liabilityReason: params.liabilityReason,
    },
  });

  return obligation;
}

export const obligationService = {
  /**
   * Consumes `academic.term.census_locked` (System Design §8.1). Creates one PSF
   * obligation per billable enrollment plus balanced ledger postings. Idempotent
   * via processed_events and the unique (tenant, term, student) constraint.
   */
  async handleCensusLocked(event: CensusLockedEvent): Promise<void> {
    const payload = event.payload as TermCensusLockedPayload;
    const { tenantId, termId, psfRateMinor, rateSnapshotId } = payload;

    if (psfRateMinor <= 0) {
      throw new LoomisError('LEDGER_PSF_RATE_ZERO_BLOCKED', 422, 'PSF rate must be greater than zero (CON-006)');
    }

    const studentIds = await enrollmentService.listBillableStudentIdsForTerm(tenantId, termId);

    await withTenantContext(tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        ACADEMIC_EVENT_TYPES.termCensusLocked,
      );
      if (!claimed) return;

      for (const studentId of studentIds) {
        await createObligationWithPosting(tx, {
          tenantId,
          termId,
          studentId,
          rateSnapshotId,
          amountMinor: psfRateMinor,
          liabilityReason: 'census_locked',
        });
      }
    });
  },

  /**
   * Consumes `student.late_enrolled` (System Design §8.1 post-census). Creates a
   * PSF obligation immediately at the term's census rate snapshot — never at
   * payment time.
   */
  async handleLateEnrolled(event: LateEnrolledEvent): Promise<void> {
    const payload = event.payload as StudentLateEnrolledPayload;
    const { tenantId, termId, studentId, rateSnapshotId, psfRateMinor } = payload;

    if (psfRateMinor <= 0) {
      throw new LoomisError('LEDGER_PSF_RATE_ZERO_BLOCKED', 422, 'PSF rate must be greater than zero (CON-006)');
    }

    await withTenantContext(tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        STUDENT_EVENT_TYPES.LATE_ENROLLED,
      );
      if (!claimed) return;

      const existing = await obligationRepository.findByStudentTermInTx(
        tx,
        tenantId,
        studentId,
        termId,
      );
      if (existing) return;

      await createObligationWithPosting(tx, {
        tenantId,
        termId,
        studentId,
        rateSnapshotId,
        amountMinor: psfRateMinor,
        liabilityReason: 'late_enrollment',
      });
    });
  },

  /**
   * Applies an approved platform billing adjustment — add or remove students from
   * the snapshot obligation set via `platform_adjustment` ledger corrections.
   */
  async applySnapshotAdjustment(
    tx: Executor,
    params: {
      tenantId: string;
      termId: string;
      requestId: string;
      deltaType: 'add_students' | 'remove_students';
      studentIds: string[];
      psfRateMinor: number;
      rateSnapshotId: string;
    },
  ): Promise<void> {
    if (params.psfRateMinor <= 0) {
      throw new LoomisError('LEDGER_PSF_RATE_ZERO_BLOCKED', 422, 'PSF rate must be greater than zero');
    }

    for (const studentId of params.studentIds) {
      if (params.deltaType === 'add_students') {
        const existing = await obligationRepository.findByStudentTermInTx(
          tx,
          params.tenantId,
          studentId,
          params.termId,
        );
        if (existing) continue;

        await createObligationWithPosting(tx, {
          tenantId: params.tenantId,
          termId: params.termId,
          studentId,
          rateSnapshotId: params.rateSnapshotId,
          amountMinor: params.psfRateMinor,
          liabilityReason: 'platform_adjustment',
        });
        continue;
      }

      const obligation = await obligationRepository.findByStudentTermForUpdate(
        tx,
        params.tenantId,
        studentId,
        params.termId,
      );
      if (!obligation || obligation.status === 'written_off') continue;

      await ledgerService.postObligationReversal(tx, {
        tenantId: params.tenantId,
        sourceId: params.requestId,
        amountMinor: obligation.amountMinor,
      });

      await tx
        .update(psfObligations)
        .set({ status: 'written_off', notes: `platform_adjustment:${params.requestId}` } as never)
        .where(eq(psfObligations.id, obligation.id));
    }
  },
};
