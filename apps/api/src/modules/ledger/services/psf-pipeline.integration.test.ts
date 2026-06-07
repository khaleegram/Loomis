import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { psfObligations, psfSettlements } from '../../../../drizzle/schema/ledger.js';
import { enrollmentAttestations } from '../../../../drizzle/schema/student.js';
import { registerLedgerEventConsumers } from '../events/index.js';
import { obligationRepository } from '../repository/obligation.repository.js';
import { settlementService } from './settlement.service.js';
import { censusService } from '../../academic/services/census.service.js';
import { admissionService } from '../../student/services/admission.service.js';
import { enrollmentService } from '../../student/services/enrollment.service.js';
import { studentService } from '../../student/services/student.service.js';
import { attestationRepository } from '../../student/repository/attestation.repository.js';
import { drainOutbox } from '../../../test/outbox-dispatch.js';
import { buildPsfPipelineFixture, type PsfPipelineFixture } from '../../../test/psf-pipeline.harness.js';
import { withTenantContext } from '../../../shared/tenant-context.js';

describe('PSF billing entitlement pipeline (integration)', () => {
  let fixture: PsfPipelineFixture;

  beforeAll(async () => {
    registerLedgerEventConsumers();
    fixture = await buildPsfPipelineFixture(2);
  }, 120_000);

  it('creates no PSF obligations before census lock', async () => {
    const count = await obligationRepository.countForTerm(fixture.tenantId, fixture.termId);
    expect(count).toBe(0);
  });

  it('creates obligations and attestation when census locks via outbox', async () => {
    await censusService.lockCensus(
      fixture.tenantId,
      fixture.termId,
      {
        declaredBillableCount: fixture.enrolledStudentIds.length,
        belowMtcAcknowledged: false,
      },
      fixture.actor,
    );

    const attestation = await attestationRepository.findByTerm(fixture.tenantId, fixture.termId);
    expect(attestation).not.toBeNull();
    expect(attestation?.declaredBillableCount).toBe(fixture.enrolledStudentIds.length);
    expect(attestation?.systemBillableCount).toBe(fixture.enrolledStudentIds.length);
    expect(attestation?.studentListHash).toHaveLength(64);
    expect(attestation?.attestationHash).toHaveLength(64);

    let drained = 0;
    do {
      drained = await drainOutbox();
    } while (drained > 0);

    const count = await obligationRepository.countForTerm(fixture.tenantId, fixture.termId);
    expect(count).toBe(fixture.enrolledStudentIds.length);

    const obligations = await withTenantContext(fixture.tenantId, async (tx) =>
      tx
        .select()
        .from(psfObligations)
        .where(eq(psfObligations.termId, fixture.termId)),
    );
    for (const row of obligations) {
      expect(row.liabilityReason).toBe('census_locked');
      expect(row.amountMinor).toBe(attestation?.psfRateMinor);
    }
  });

  it('settles an obligation on payment without creating a new one', async () => {
    const beforeCount = await obligationRepository.countForTerm(fixture.tenantId, fixture.termId);
    const studentId = fixture.enrolledStudentIds[0]!;
    const paymentId = crypto.randomUUID();

    await settlementService.handlePaymentVerified({
      event_id: crypto.randomUUID(),
      event_type: 'payment.verified',
      tenant_id: fixture.tenantId,
      aggregate_type: 'payment',
      aggregate_id: paymentId,
      payload: {
        tenantId: fixture.tenantId,
        paymentId,
        invoiceId: crypto.randomUUID(),
        studentId,
        termId: fixture.termId,
        amountMinor: 500_000,
        channel: 'online',
        verifiedAt: new Date().toISOString(),
        verifiedById: fixture.actor.userId,
      },
    });

    const afterCount = await obligationRepository.countForTerm(fixture.tenantId, fixture.termId);
    expect(afterCount).toBe(beforeCount);

    const settlements = await withTenantContext(fixture.tenantId, async (tx) =>
      tx.select().from(psfSettlements).where(eq(psfSettlements.tenantId, fixture.tenantId)),
    );
    expect(settlements.length).toBeGreaterThan(0);
  });

  it('bills a late enrollment at the census rate snapshot', async () => {
    const suffix = fixture.enrolledStudentIds[0]!.slice(0, 8);
    const admission = await admissionService.createAdmission(
      fixture.tenantId,
      {
        firstName: 'Late',
        lastName: suffix,
        dateOfBirth: '2013-01-15',
        gender: 'female',
        intendedClassLevelId: fixture.classLevelId,
        guardianName: 'Guardian',
        guardianEmail: `late-${suffix}@example.com`,
        guardianPhone: '+2348098765432',
        guardianRelationship: 'mother',
      },
      fixture.actor,
    );

    const decided = await admissionService.decideAdmission(
      fixture.tenantId,
      admission.id,
      { decision: 'approve', admissionNo: `LATE-${suffix}` },
      fixture.actor,
    );
    const lateStudentId = decided.student?.id;
    if (!lateStudentId) throw new Error('Late student not created');

    await studentService.recordIdentityAttestation(
      fixture.tenantId,
      lateStudentId,
      { attestationType: 'birth_certificate' },
      fixture.actor,
    );

    const beforeCount = await obligationRepository.countForTerm(fixture.tenantId, fixture.termId);

    await enrollmentService.enrollStudent(
      fixture.tenantId,
      lateStudentId,
      { termId: fixture.termId, classArmId: fixture.classArmId },
      fixture.actor,
    );

    let drained = 0;
    do {
      drained = await drainOutbox();
    } while (drained > 0);

    const afterCount = await obligationRepository.countForTerm(fixture.tenantId, fixture.termId);
    expect(afterCount).toBe(beforeCount + 1);

    const obligation = await obligationRepository.findByStudentTerm(
      fixture.tenantId,
      lateStudentId,
      fixture.termId,
    );
    expect(obligation?.liabilityReason).toBe('late_enrollment');

    const attestation = await withTenantContext(fixture.tenantId, async (tx) => {
      const [row] = await tx
        .select()
        .from(enrollmentAttestations)
        .where(eq(enrollmentAttestations.termId, fixture.termId))
        .limit(1);
      return row ?? null;
    });
    expect(obligation?.rateSnapshotId).toBe(attestation?.rateSnapshotId);
    expect(obligation?.amountMinor).toBe(attestation?.psfRateMinor);
  });
});
