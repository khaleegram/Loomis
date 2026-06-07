import type { CreateEnrollmentRequest, EnrollmentResponse } from '@loomis/contracts';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { STUDENT_EVENT_TYPES } from '../events/types.js';
import { attestationRepository } from '../repository/attestation.repository.js';
import { studentOutboxRepository } from '../repository/outbox.repository.js';
import { studentRepository } from '../repository/student.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';

function serializeEnrollment(
  row: NonNullable<Awaited<ReturnType<typeof studentRepository.findEnrollmentForTerm>>>,
): EnrollmentResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    studentId: row.studentId,
    termId: row.termId,
    classArmId: row.classArmId,
    status: row.status as EnrollmentResponse['status'],
    enrolledAt: row.enrolledAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    endReason: row.endReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const enrollmentService = {
  /**
   * US-SIS-003. Enroll an admitted student into a class arm for the open term,
   * or into a census-locked term as a late billable enrollment (System Design
   * §8.1). Billable status requires identity attestation on file (FR-SIS-002).
   */
  async enrollStudent(
    tenantId: string,
    studentId: string,
    input: CreateEnrollmentRequest,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);

    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }
    if (student.status !== 'admitted' && student.status !== 'enrolled') {
      throw new LoomisError(
        'STUDENT_NOT_ADMITTED',
        409,
        'Only admitted or enrolled students can be enrolled in a term',
      );
    }

    const term = await academicRepository.findTermById(tenantId, input.termId);
    if (!term) {
      throw new LoomisError('ACADEMIC_TERM_NOT_FOUND', 404, 'Academic term not found');
    }
    const isLateEnrollment = term.status === 'census_locked';
    if (term.status !== 'open' && !isLateEnrollment) {
      throw new LoomisError(
        'STUDENT_TERM_NOT_OPEN',
        409,
        'Enrollment is only allowed while the term is open or after census lock for late enrollments',
      );
    }

    const arm = await academicRepository.findClassArmById(tenantId, input.classArmId);
    if (!arm || arm.academicYearId !== term.academicYearId) {
      throw new LoomisError(
        'STUDENT_CLASS_ARM_INVALID',
        422,
        'Class arm not found or does not belong to the term academic year',
      );
    }

    const existing = await studentRepository.findEnrollmentForTerm(
      tenantId,
      studentId,
      input.termId,
    );
    if (existing) {
      throw new LoomisError(
        'STUDENT_ALREADY_ENROLLED',
        409,
        'Student is already enrolled for this term',
      );
    }

    const billable = student.identityAttestationType !== null;
    if (isLateEnrollment && !billable) {
      throw new LoomisError(
        'STUDENT_LATE_ENROLLMENT_NOT_BILLABLE',
        422,
        'Late enrollment after census lock requires identity attestation for PSF billing',
      );
    }

    const attestation = isLateEnrollment
      ? await attestationRepository.findByTerm(tenantId, input.termId)
      : null;
    if (isLateEnrollment && !attestation) {
      throw new LoomisError(
        'STUDENT_CENSUS_ATTESTATION_MISSING',
        422,
        'Cannot bill a late enrollment without a census attestation for this term',
      );
    }

    if (isLateEnrollment && attestation) {
      const enrollment = await withTenantContext(tenantId, async (tx) => {
        const row = await studentRepository.createEnrollmentTx(
          tx,
          tenantId,
          studentId,
          input,
          actor.userId,
          true,
        );

        if (student.status === 'admitted') {
          await studentRepository.updateStudentStatusTx(tx, tenantId, studentId, 'enrolled');
        }

        await studentOutboxRepository.append(tx, {
          tenantId,
          aggregateType: 'enrollment',
          aggregateId: row.id,
          eventType: STUDENT_EVENT_TYPES.LATE_ENROLLED,
          payload: {
            tenantId,
            studentId,
            enrollmentId: row.id,
            termId: input.termId,
            classArmId: input.classArmId,
            rateSnapshotId: attestation.rateSnapshotId,
            psfRateMinor: attestation.psfRateMinor,
            enrolledById: actor.userId,
            enrolledAt: row.enrolledAt.toISOString(),
          },
        });

        return row;
      });

      return serializeEnrollment(enrollment);
    }

    const enrollment = await studentRepository.createEnrollment(
      tenantId,
      studentId,
      input,
      actor.userId,
      billable,
    );

    if (student.status === 'admitted') {
      await studentRepository.updateStudentStatus(tenantId, studentId, 'enrolled');
    }

    await studentOutboxRepository.publish({
      tenantId,
      aggregateType: 'enrollment',
      aggregateId: enrollment.id,
      eventType: STUDENT_EVENT_TYPES.ENROLLED,
      payload: {
        tenantId,
        studentId,
        enrollmentId: enrollment.id,
        termId: input.termId,
        classArmId: input.classArmId,
        status: enrollment.status,
        enrolledById: actor.userId,
        enrolledAt: enrollment.enrolledAt.toISOString(),
      },
    });

    return serializeEnrollment(enrollment);
  },

  async listEnrollmentsForStudent(tenantId: string, studentId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const rows = await studentRepository.listEnrollmentsForStudent(tenantId, studentId);
    return rows.map(serializeEnrollment);
  },

  /** Census lock reads this count (System Design §8.1). */
  async countBillableForTerm(tenantId: string, termId: string): Promise<number> {
    return studentRepository.countBillableEnrollments(tenantId, termId);
  },

  /** Ledger census consumer reads billable student IDs (cross-module service read). */
  async listBillableStudentIdsForTerm(tenantId: string, termId: string): Promise<string[]> {
    return studentRepository.listBillableStudentIds(tenantId, termId);
  },
};
