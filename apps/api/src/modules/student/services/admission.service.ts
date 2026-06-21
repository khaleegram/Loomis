import type {
  AdmissionDecisionRequest,
  AdmissionDecisionResponse,
  AdmissionResponse,
  CreateAdmissionRequest,
  CreateAdmissionResponse,
  TenantExperienceFlags,
} from '@loomis/contracts';
import { canDecideAdmissions, mergeExperienceFlags, shouldAutoApproveAdmissionOnCreate } from '@loomis/core';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { DEFAULT_STUDENT_PROVISIONED_PASSWORD } from '../../identity/services/provisioned-password.service.js';
import { studentAccountService } from '../../identity/services/student-account.service.js';
import { transactionalEmailService } from '../../comms/services/transactional-email.service.js';
import { LoomisError } from '../../../shared/errors.js';
import { studentRepository } from '../repository/student.repository.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
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
  /** US-SIS-001. Register applicant; auto-admits when policy allows (Core default). */
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

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    const flags = mergeExperienceFlags(tenant.experienceFlags as TenantExperienceFlags);

    const row = await studentRepository.createAdmission(tenantId, input, actor.userId);

    if (
      shouldAutoApproveAdmissionOnCreate(flags) &&
      canDecideAdmissions(actor.role, flags)
    ) {
      const decided = await admissionService.decideAdmission(
        tenantId,
        row.id,
        { decision: 'approve' },
        actor,
      );
      return {
        admission: decided.admission,
        student: decided.student,
        autoApproved: true,
        portalCredentials: decided.portalCredentials ?? null,
        credentialsEmail: decided.credentialsEmail,
      };
    }

    return {
      admission: serializeAdmission(row),
      student: null,
      autoApproved: false,
    };
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
   * US-SIS-002. Approve or decline. Core default: Admin Officer decides.
   * When `admissionsRequirePrincipalApproval` is enabled, only Principal/Owner may decide.
   */
  async decideAdmission(
    tenantId: string,
    admissionId: string,
    input: AdmissionDecisionRequest,
    actor: ActorContext,
  ): Promise<AdmissionDecisionResponse> {
    requireTenant(actor, tenantId);

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    const flags = mergeExperienceFlags(tenant.experienceFlags as TenantExperienceFlags);
    if (!canDecideAdmissions(actor.role, flags)) {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Your role cannot approve admissions under the current school policy',
      );
    }

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
