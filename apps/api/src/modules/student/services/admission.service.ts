import type {
  AdmissionDecisionRequest,
  AdmissionResponse,
  CreateAdmissionRequest,
} from '@loomis/contracts';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { DEFAULT_STUDENT_PROVISIONED_PASSWORD } from '../../identity/services/provisioned-password.service.js';
import { studentAccountService } from '../../identity/services/student-account.service.js';
import { transactionalEmailService } from '../../comms/services/transactional-email.service.js';
import { LoomisError } from '../../../shared/errors.js';
import { studentRepository } from '../repository/student.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';

function serializeAdmission(
  row: NonNullable<Awaited<ReturnType<typeof studentRepository.findAdmissionById>>>,
): AdmissionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    referenceNumber: row.referenceNumber,
    status: row.status as AdmissionResponse['status'],
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender as AdmissionResponse['gender'],
    intendedClassLevelId: row.intendedClassLevelId,
    guardianName: row.guardianName,
    guardianEmail: row.guardianEmail,
    guardianPhone: row.guardianPhone,
    guardianRelationship: row.guardianRelationship as AdmissionResponse['guardianRelationship'],
    declineReason: row.declineReason,
    studentId: row.studentId,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const admissionService = {
  /** US-SIS-001. Admin Officer submits a new admission application. */
  async createAdmission(tenantId: string, input: CreateAdmissionRequest, actor: ActorContext) {
    requireTenant(actor, tenantId);

    const level = await academicRepository.findClassLevelById(tenantId, input.intendedClassLevelId);
    if (!level) {
      throw new LoomisError(
        'ACADEMIC_CLASS_LEVEL_NOT_FOUND',
        404,
        'Intended class level not found for this tenant',
      );
    }

    const row = await studentRepository.createAdmission(tenantId, input, actor.userId);
    return serializeAdmission(row);
  },

  async listAdmissions(tenantId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const rows = await studentRepository.listAdmissions(tenantId);
    return rows.map(serializeAdmission);
  },

  async getAdmission(tenantId: string, admissionId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const row = await studentRepository.findAdmissionById(tenantId, admissionId);
    if (!row) {
      throw new LoomisError('STUDENT_ADMISSION_NOT_FOUND', 404, 'Admission application not found');
    }
    return serializeAdmission(row);
  },

  /**
   * US-SIS-002. Principal approves or declines. Approval creates the student
   * record; enrollment is a separate step (US-SIS-003).
   */
  async decideAdmission(
    tenantId: string,
    admissionId: string,
    input: AdmissionDecisionRequest,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);

    const admission = await studentRepository.findAdmissionById(tenantId, admissionId);
    if (!admission) {
      throw new LoomisError('STUDENT_ADMISSION_NOT_FOUND', 404, 'Admission application not found');
    }
    if (admission.status !== 'pending') {
      throw new LoomisError(
        'STUDENT_ADMISSION_NOT_PENDING',
        409,
        'This admission application has already been decided',
      );
    }

    if (input.decision === 'approve' && input.admissionNo) {
      const exists = await studentRepository.admissionNoExists(tenantId, input.admissionNo);
      if (exists) {
        throw new LoomisError(
          'STUDENT_ADMISSION_NUMBER_CONFLICT',
          409,
          'Admission number is already assigned to another student',
        );
      }
    }

    const result = await studentRepository.decideAdmission(
      tenantId,
      admissionId,
      input,
      actor.userId,
    );
    if (!result) {
      throw new LoomisError(
        'STUDENT_ADMISSION_NOT_PENDING',
        409,
        'Admission could not be decided — it may have been updated concurrently',
      );
    }

    let portalCredentials: { loginEmail: string; temporaryPassword: string } | null = null;
    let studentUserId: string | null = null;
    let credentialsEmail: import('@loomis/contracts').EmailDeliveryResult | undefined;
    if (result.student) {
      const temporaryPassword = DEFAULT_STUDENT_PROVISIONED_PASSWORD;
      const { user, loginEmail } = await studentAccountService.createPortalAccount({
        tenantId,
        admissionNo: result.student.admissionNo,
        password: temporaryPassword,
        displayName: `${result.student.firstName} ${result.student.lastName}`,
      });
      const linked = await studentRepository.linkStudentUserId(tenantId, result.student.id, user.id);
      if (!linked) {
        throw new LoomisError('INTERNAL_ERROR', 500, 'Failed to link student portal account');
      }
      studentUserId = user.id;
      portalCredentials = { loginEmail, temporaryPassword };

      credentialsEmail = await transactionalEmailService.sendStudentPortalCredentials({
        tenantId,
        userId: user.id,
        to: admission.guardianEmail,
        guardianName: admission.guardianName,
        studentFirstName: result.student.firstName,
        studentLastName: result.student.lastName,
        loginEmail,
        temporaryPassword,
      });
    }

    return {
      admission: serializeAdmission(result.admission),
      student: result.student
        ? {
            id: result.student.id,
            tenantId: result.student.tenantId,
            admissionId: result.student.admissionId,
            admissionNo: result.student.admissionNo,
            firstName: result.student.firstName,
            lastName: result.student.lastName,
            dateOfBirth: result.student.dateOfBirth,
            gender: result.student.gender as AdmissionResponse['gender'],
            status: result.student.status as 'admitted',
            userId: studentUserId,
            identityAttestationType: null,
            identityAttestedAt: null,
            createdAt: result.student.createdAt.toISOString(),
            updatedAt: result.student.updatedAt.toISOString(),
          }
        : null,
      portalCredentials,
      credentialsEmail,
    };
  },
};
