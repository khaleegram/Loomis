import type {
  RecordIdentityAttestationRequest,
  SetStudentPhotoRequest,
  StudentProfileResponse,
  StudentResponse,
  TransferStudentOutRequest,
} from '@loomis/contracts';
import {
  isAdvancedTier,
  mergeExperienceFlags,
  workflowsInboxEnabled,
} from '@loomis/core';
import { LoomisError } from '../../../shared/errors.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { workflowService } from '../../workflow/services/workflow.service.js';
import { STUDENT_EVENT_TYPES } from '../events/types.js';
import { studentOutboxRepository } from '../repository/outbox.repository.js';
import { studentRepository } from '../repository/student.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';
import { admissionService } from './admission.service.js';
import { enrollmentService } from './enrollment.service.js';
import { parentLinkService } from './parent-link.service.js';

function serializeStudent(
  row: NonNullable<Awaited<ReturnType<typeof studentRepository.findStudentById>>>,
): StudentResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    admissionId: row.admissionId,
    admissionNo: row.admissionNo,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: row.dateOfBirth,
    gender: row.gender as StudentResponse['gender'],
    status: row.status as StudentResponse['status'],
    identityAttestationType: row.identityAttestationType as StudentResponse['identityAttestationType'],
    identityAttestedAt: row.identityAttestedAt?.toISOString() ?? null,
    photoStorageObjectId: row.photoStorageObjectId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const studentService = {
  async listStudents(tenantId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const rows = await studentRepository.listStudents(tenantId);
    return rows.map(serializeStudent);
  },

  async getStudent(tenantId: string, studentId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const row = await studentRepository.findStudentById(tenantId, studentId);
    if (!row) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }
    return serializeStudent(row);
  },

  /**
   * US-SIS-007. Profile aggregates tenant-scoped data first, then fetches
   * parent identities by ID in a separate global query (CON-002).
   */
  async getStudentProfile(
    tenantId: string,
    studentId: string,
    actor: ActorContext,
  ): Promise<StudentProfileResponse> {
    requireTenant(actor, tenantId);

    const student = await this.getStudent(tenantId, studentId, actor);
    const admissionRow = await studentRepository.findAdmissionById(tenantId, student.admissionId);
    const enrollments = await enrollmentService.listEnrollmentsForStudent(
      tenantId,
      studentId,
      actor,
    );
    const links = await parentLinkService.listParentLinksForStudent(tenantId, studentId, actor);

    const identityIds = [...new Set(links.map((l) => l.parentIdentityId))];
    const identities = await studentRepository.findParentIdentitiesByIds(identityIds);
    const identityMap = new Map(identities.map((i) => [i.id, i]));

    const parentLinks = links.map((link) => {
      const identity = identityMap.get(link.parentIdentityId);
      if (!identity) {
        throw new LoomisError('INTERNAL_ERROR', 500, 'Parent identity record missing');
      }
      return {
        ...link,
        parentIdentity: {
          id: identity.id,
          emailNormalized: identity.emailNormalized,
          phoneE164: identity.phoneE164,
          fullName: identity.fullName,
          status: identity.status as 'unverified' | 'verified' | 'recovery_locked' | 'suspended',
          userId: identity.userId,
        },
      };
    });

    return {
      student,
      admission: admissionRow ? await admissionService.getAdmission(tenantId, admissionRow.id, actor) : null,
      enrollments,
      parentLinks,
    };
  },

  /** FR-SIS-002. Identity attestation required before billable enrollment. */
  async recordIdentityAttestation(
    tenantId: string,
    studentId: string,
    input: RecordIdentityAttestationRequest,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);
    const row = await studentRepository.recordIdentityAttestation(
      tenantId,
      studentId,
      input.attestationType,
      actor.userId,
    );
    if (!row) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }
    return serializeStudent(row);
  },

  /** US-SIS-006. Transfer out — Admin initiates workflow in Advanced; Principal/Owner may execute directly. */
  async transferOut(
    tenantId: string,
    studentId: string,
    input: TransferStudentOutRequest,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);

    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }
    if (student.status === 'transferred_out' || student.status === 'graduated') {
      throw new LoomisError(
        'STUDENT_TRANSFER_BLOCKED',
        409,
        'Student has already left the school',
      );
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }
    const flags = mergeExperienceFlags(tenant.experienceFlags);
    const inboxModule =
      isAdvancedTier(tenant.experienceTier as 'core' | 'advanced' | 'enterprise') &&
      workflowsInboxEnabled(tenant.experienceTier as 'core' | 'advanced' | 'enterprise', flags);

    if (inboxModule && actor.role === 'admin_officer') {
      const started = await workflowService.startWorkflow({
        workflowType: 'student_transfer_out',
        tenantId,
        requestedById: actor.userId,
        requestedByRole: actor.role,
        subjectType: 'student',
        subjectId: studentId,
        title: `Transfer out: ${student.firstName} ${student.lastName}`,
        payload: {
          studentId,
          destinationSchool: input.destinationSchool,
          reason: input.reason,
        },
      });
      return {
        student: serializeStudent(student),
        pendingApproval: true,
        workflowInstanceId: started.workflowInstanceId,
      };
    }

    return this.executeTransferOut(tenantId, studentId, input, actor.userId);
  },

  async applyApprovedTransferOut(
    tenantId: string,
    payload: Record<string, unknown>,
    approvedById: string,
  ) {
    const studentId = payload.studentId;
    const destinationSchool = payload.destinationSchool;
    const reason = payload.reason;
    if (
      typeof studentId !== 'string' ||
      typeof destinationSchool !== 'string' ||
      typeof reason !== 'string'
    ) {
      return;
    }
    await this.executeTransferOut(
      tenantId,
      studentId,
      { destinationSchool, reason },
      approvedById,
    );
  },

  async executeTransferOut(
    tenantId: string,
    studentId: string,
    input: TransferStudentOutRequest,
    actorUserId: string,
  ) {
    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }
    if (student.status === 'transferred_out' || student.status === 'graduated') {
      throw new LoomisError(
        'STUDENT_TRANSFER_BLOCKED',
        409,
        'Student has already left the school',
      );
    }

    const ended = await studentRepository.endActiveEnrollments(tenantId, studentId, 'transfer');
    const updated = await studentRepository.markTransferredOut(
      tenantId,
      studentId,
      input.destinationSchool,
      input.reason,
      actorUserId,
    );
    if (!updated) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }

    await studentOutboxRepository.publish({
      tenantId,
      aggregateType: 'student',
      aggregateId: studentId,
      eventType: STUDENT_EVENT_TYPES.TRANSFERRED_OUT,
      payload: {
        tenantId,
        studentId,
        destinationSchool: input.destinationSchool,
        reason: input.reason,
        transferredById: actorUserId,
        transferredAt: updated.transferredAt?.toISOString() ?? new Date().toISOString(),
      },
    });

    return {
      student: serializeStudent(updated),
      endedEnrollments: ended.length,
    };
  },

  async setPhoto(
    tenantId: string,
    studentId: string,
    input: SetStudentPhotoRequest,
    actor: ActorContext,
  ): Promise<StudentResponse> {
    requireTenant(actor, tenantId);
    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }
    const updated = await studentRepository.setPhoto(tenantId, studentId, input.storageObjectId);
    if (!updated) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }
    return serializeStudent(updated);
  },
};
