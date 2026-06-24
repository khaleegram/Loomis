import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { attestationRepository } from '../../student/repository/attestation.repository.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import {
  buildAttestationHash,
  buildStudentListHash,
} from '../../student/utils/attestation-hash.js';
import { configurationRepository } from '../../tenant/repository/configuration.repository.js';
import { psfRateService } from '../../tenant/services/psf-rate.service.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import type { TermCensusLockedPayload } from '../events/types.js';
import { ACADEMIC_EVENT_TYPES } from '../events/types.js';
import { academicRepository } from '../repository/academic.repository.js';
import { outboxRepository } from '../repository/outbox.repository.js';
import type { ActorContext, CensusLockInput } from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';

/** Variance tolerance before a documented reason is required (System Design §8.1 step 3). */
const VARIANCE_TOLERANCE = 0.02;

const MTC_CONFIG_KEY = 'minimum_term_commitment';

function parseMinimumTermCommitment(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return null;
}

export const censusService = {
  /**
   * Read-only census review (US-ASM-003). Returns the system billable count,
   * class-level breakdown, MTC, and effective PSF rate without locking.
   */
  async previewCensus(tenantId: string, termId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const term = await requireTerm(tenantId, termId);

    if (term.status === 'census_locked' || term.status === 'closed') {
      throw new LoomisError(
        'ACADEMIC_CENSUS_ALREADY_LOCKED',
        409,
        'The census for this term has already been locked',
      );
    }
    if (term.status !== 'open') {
      throw new LoomisError(
        'ACADEMIC_CENSUS_NOT_READY',
        409,
        'The term must be open before its census can be reviewed (FR-ASM-005)',
      );
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    const [studentIds, classLevelBreakdown, mtcConfig] = await Promise.all([
      studentRepository.listBillableStudentIds(tenantId, termId),
      studentRepository.listBillableCountByClassLevel(tenantId, termId),
      configurationRepository.findByKey(tenantId, MTC_CONFIG_KEY),
    ]);

    const psfRateMinor = await psfRateService.resolveEffectiveRateMinor(tenantId, tenant.tierId);

    return {
      termId: term.id,
      academicYearId: term.academicYearId,
      termName: term.name,
      termStatus: term.status,
      systemBillableCount: studentIds.length,
      classLevelBreakdown,
      minimumTermCommitment: parseMinimumTermCommitment(mtcConfig?.value ?? null),
      psfRateMinor: psfRateMinor !== null && psfRateMinor > 0 ? psfRateMinor : null,
      varianceTolerance: VARIANCE_TOLERANCE,
    };
  },

  /**
   * Locks the enrollment census (FR-SIS-006 / FR-ASM-005 / US-ASM-003; System
   * Design §8.1). Step-up MFA and the Idempotency-Key are enforced at the route.
   *
   * Validates pre-conditions, resolves the effective PSF rate (must exist and be
   * non-zero — CON-011/CON-006), then performs the lock in a single SERIALIZABLE
   * transaction that flips the term to `census_locked`, writes the immutable
   * `enrollment_attestation`, and appends the `academic.term.census_locked`
   * outbox event. The Ledger module consumes that event to create one PSF
   * obligation per billable student plus balanced double-entry postings. PSF
   * obligations are created by census lock, never by payment. This action
   * cannot be undone.
   */
  async lockCensus(tenantId: string, termId: string, input: CensusLockInput, actor: ActorContext) {
    requireTenant(actor, tenantId);

    if (actor.role !== 'school_owner') {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Only the school owner may lock census (ROLE_EXPERIENCE_TIER_PLAN §5)',
      );
    }

    const term = await requireTerm(tenantId, termId);

    if (term.status === 'census_locked' || term.status === 'closed') {
      throw new LoomisError(
        'ACADEMIC_CENSUS_ALREADY_LOCKED',
        409,
        'The census for this term has already been locked (cannot be undone)',
      );
    }
    if (term.status !== 'open') {
      throw new LoomisError(
        'ACADEMIC_CENSUS_NOT_READY',
        409,
        'The term must be open before its census can be locked (FR-ASM-005)',
      );
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    const psfRateMinor = await psfRateService.resolveEffectiveRateMinor(tenantId, tenant.tierId);
    if (psfRateMinor === null || psfRateMinor <= 0) {
      throw new LoomisError(
        'ACADEMIC_CENSUS_PSF_RATE_MISSING',
        422,
        'No non-zero PSF rate is configured for this tenant; census lock is blocked (CON-006/CON-011)',
      );
    }

    const rateSnapshot = await psfRateService.ensureBillingSnapshot(tenantId, psfRateMinor);

    const locked = await withTenantContext(
      tenantId,
      async (tx) => {
        const studentIds = await studentRepository.listBillableStudentIdsTx(tx, tenantId, termId);
        const systemBillableCount = studentIds.length;
        const denominator = systemBillableCount === 0 ? 1 : systemBillableCount;
        const variance =
          Math.abs(input.declaredBillableCount - systemBillableCount) / denominator;
        if (variance > VARIANCE_TOLERANCE && !input.varianceReason) {
          throw new LoomisError(
            'ACADEMIC_CENSUS_VARIANCE_REASON_REQUIRED',
            422,
            'The declared count differs from the system count beyond tolerance; a documented reason is required (System Design §8.1)',
            { declared: input.declaredBillableCount, system: systemBillableCount },
          );
        }

        const now = new Date();
        const lockedAt = now.toISOString();
        const studentListHash = buildStudentListHash(studentIds);
        const attestationHash = buildAttestationHash({
          tenantId,
          termId,
          declaredBillableCount: input.declaredBillableCount,
          systemBillableCount,
          studentListHash,
          rateSnapshotId: rateSnapshot.id,
          psfRateMinor,
          attestedById: actor.userId,
          lockedAt,
        });

        const updatedTerm = await academicRepository.lockCensusInTx(tx, {
          tenantId,
          termId,
          declaredBillableCount: input.declaredBillableCount,
          systemBillableCount,
          varianceReason: input.varianceReason ?? null,
          attestedById: actor.userId,
          lockedAt: now,
        });
        if (!updatedTerm) return null;

        await attestationRepository.insert(tx, {
          tenantId,
          termId,
          declaredBillableCount: input.declaredBillableCount,
          systemBillableCount,
          attestedById: actor.userId,
          attestedAt: now,
          studentListHash,
          attestationHash,
          rateSnapshotId: rateSnapshot.id,
          psfRateMinor,
        });

        const eventPayload: TermCensusLockedPayload = {
          tenantId,
          academicYearId: term.academicYearId,
          termId,
          declaredBillableCount: input.declaredBillableCount,
          systemBillableCount,
          psfRateMinor,
          rateSnapshotId: rateSnapshot.id,
          studentListHash,
          attestationHash,
          attestedById: actor.userId,
          censusLockedAt: lockedAt,
        };

        await outboxRepository.append(tx, {
          aggregateType: 'academic_term',
          aggregateId: termId,
          eventType: ACADEMIC_EVENT_TYPES.termCensusLocked,
          tenantId,
          payload: eventPayload,
        });

        return { term: updatedTerm, systemBillableCount };
      },
      { isolationLevel: 'serializable' },
    );

    if (!locked) {
      throw new LoomisError(
        'ACADEMIC_CENSUS_ALREADY_LOCKED',
        409,
        'The census for this term has already been locked',
      );
    }

    return { term: locked.term, psfRateMinor, systemBillableCount: locked.systemBillableCount };
  },
};
