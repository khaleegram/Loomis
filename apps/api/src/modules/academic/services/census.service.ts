import { createHash } from 'node:crypto';
import { LoomisError } from '../../../shared/errors.js';
import { psfRateService } from '../../tenant/services/psf-rate.service.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import type { TermCensusLockedPayload } from '../events/types.js';
import { academicRepository } from '../repository/academic.repository.js';
import type { ActorContext, CensusLockInput } from '../types.js';
import { requireTenant, requireTerm } from './_shared.js';

/** Variance tolerance before a documented reason is required (System Design §8.1 step 3). */
const VARIANCE_TOLERANCE = 0.02;

/**
 * The authoritative billable-enrollment count for a term comes from
 * `student.enrollments` (status `active_billable`).
 *
 * BLOCKED: the Student module (next in Phase 1) is not built yet, so there is no
 * enrollment source to count. We return `null` ("unknown") rather than a
 * fabricated number (loomis-implementation-guardrails: no fake data). When the
 * Student module ships, replace this with a real read of active billable
 * enrollments for the term and the variance check below activates.
 */
// eslint-disable-next-line @typescript-eslint/require-await
async function readSystemBillableCount(_tenantId: string, _termId: string): Promise<number | null> {
  return null;
}

export const censusService = {
  /**
   * Locks the enrollment census (FR-SIS-006 / FR-ASM-005 / US-ASM-003; System
   * Design §8.1). Step-up MFA and the Idempotency-Key are enforced at the route.
   *
   * Validates pre-conditions, resolves the effective PSF rate (must exist and be
   * non-zero — CON-011/CON-006), then performs the lock in a single SERIALIZABLE
   * transaction that flips the term to `census_locked` and writes the
   * `academic.term.census_locked` outbox event. The Ledger module consumes that
   * event to create one PSF obligation per billable student plus the balanced
   * double-entry postings. PSF obligations are created by census lock, never by
   * payment. This action cannot be undone.
   */
  async lockCensus(tenantId: string, termId: string, input: CensusLockInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
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

    // §8.1 step 1: a non-zero PSF rate snapshot must exist for the tenant.
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

    // §8.1 steps 2-3: compare declared vs system count. Unknown while the Student
    // module is unbuilt — the per-student fan-out and authoritative reconciliation
    // happen in the Ledger consumer using the same rate snapshot recorded here.
    const systemBillableCount = await readSystemBillableCount(tenantId, termId);
    if (systemBillableCount !== null) {
      const denominator = systemBillableCount === 0 ? 1 : systemBillableCount;
      const variance = Math.abs(input.declaredBillableCount - systemBillableCount) / denominator;
      if (variance > VARIANCE_TOLERANCE && !input.varianceReason) {
        throw new LoomisError(
          'ACADEMIC_CENSUS_VARIANCE_REASON_REQUIRED',
          422,
          'The declared count differs from the system count beyond tolerance; a documented reason is required (System Design §8.1)',
          { declared: input.declaredBillableCount, system: systemBillableCount },
        );
      }
    }

    const lockedAt = new Date().toISOString();
    const eventPayload: TermCensusLockedPayload = {
      tenantId,
      academicYearId: term.academicYearId,
      termId,
      declaredBillableCount: input.declaredBillableCount,
      systemBillableCount,
      psfRateMinor,
      attestationHash: buildAttestationHash({
        tenantId,
        termId,
        declaredBillableCount: input.declaredBillableCount,
        systemBillableCount,
        attestedById: actor.userId,
        lockedAt,
      }),
      attestedById: actor.userId,
      censusLockedAt: lockedAt,
    };

    const locked = await academicRepository.lockCensus({
      tenantId,
      termId,
      declaredBillableCount: input.declaredBillableCount,
      systemBillableCount,
      varianceReason: input.varianceReason ?? null,
      eventPayload,
    });
    if (!locked) {
      // A concurrent request won the race (the WHERE status='open' matched zero rows).
      throw new LoomisError(
        'ACADEMIC_CENSUS_ALREADY_LOCKED',
        409,
        'The census for this term has already been locked',
      );
    }

    return { term: locked, psfRateMinor, systemBillableCount };
  },
};

/** Tamper-evident digest of the attested figures (System Design §8.1 step 6). */
function buildAttestationHash(parts: {
  tenantId: string;
  termId: string;
  declaredBillableCount: number;
  systemBillableCount: number | null;
  attestedById: string;
  lockedAt: string;
}): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}
