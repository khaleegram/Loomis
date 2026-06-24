import type {
  AcceptParentLinkRequest,
  InitiateParentLinkRequest,
  ParentLinkResponse,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { STUDENT_EVENT_TYPES } from '../events/types.js';
import { studentOutboxRepository } from '../repository/outbox.repository.js';
import { studentRepository } from '../repository/student.repository.js';
import type { ActorContext } from '../types.js';
import { normalizeEmail, requireTenant } from './_shared.js';
import { parentOtpService } from './parent-otp.service.js';

const OTP_TTL_MS = 15 * 60 * 1000;

function serializeParentLink(
  row: NonNullable<Awaited<ReturnType<typeof studentRepository.findParentLinkById>>>,
): ParentLinkResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    parentIdentityId: row.parentIdentityId,
    studentId: row.studentId,
    relationship: row.relationship as ParentLinkResponse['relationship'],
    status: row.status as ParentLinkResponse['status'],
    expiresAt: row.expiresAt.toISOString(),
    activatedAt: row.activatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const parentLinkService = {
  /**
   * US-SIS-004. Admin Officer initiates a parent link. School attestation is
   * recorded at initiation; parent OTP verification is required before activation.
   * Admin Officer cannot call `acceptParentLink`.
   */
  async initiateParentLink(
    tenantId: string,
    studentId: string,
    input: InitiateParentLinkRequest,
    actor: ActorContext,
  ) {
    requireTenant(actor, tenantId);

    const student = await studentRepository.findStudentById(tenantId, studentId);
    if (!student) {
      throw new LoomisError('STUDENT_NOT_FOUND', 404, 'Student not found');
    }

    const otp = parentOtpService.generateOtp();
    const delivery = await parentOtpService.sendParentLinkOtp({
      email: input.parentEmail,
      phone: input.parentPhone,
      otp,
      linkId: 'pending',
    });
    if (!delivery.sent) {
      throw new LoomisError(
        'STUDENT_PARENT_LINK_OTP_BLOCKED',
        503,
        'Parent OTP delivery is unavailable — configure Resend and Termii credentials',
        { reason: delivery.reason },
      );
    }

    const emailNormalized = normalizeEmail(input.parentEmail);
    const parentIdentity = await studentRepository.upsertParentIdentity({
      emailNormalized,
      phoneE164: input.parentPhone,
      fullName: input.parentFullName,
    });

    const otpHash = parentOtpService.hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    const link = await studentRepository.createParentLink(
      tenantId,
      parentIdentity.id,
      studentId,
      input,
      actor.userId,
      otpHash,
      otpExpiresAt,
    );

    await studentOutboxRepository.publish({
      tenantId,
      aggregateType: 'parent_link',
      aggregateId: link.id,
      eventType: STUDENT_EVENT_TYPES.PARENT_LINK_INITIATED,
      payload: {
        tenantId,
        parentLinkId: link.id,
        parentIdentityId: parentIdentity.id,
        studentId,
        initiatedById: actor.userId,
        expiresAt: link.expiresAt.toISOString(),
      },
    });

    return serializeParentLink(link);
  },

  /**
   * US-SIS-005. Parent-only — verifies OTP and activates the link. Staff roles
   * are rejected (Admin Officer cannot self-complete, FR-SIS-003).
   */
  async acceptParentLink(
    tenantId: string,
    linkId: string,
    input: AcceptParentLinkRequest,
    actor: ActorContext,
  ) {
    if (actor.role !== 'parent') {
      throw new LoomisError(
        'STUDENT_PARENT_ACCEPT_FORBIDDEN',
        403,
        'Only a parent may verify and accept a parent-student link',
      );
    }

    const link = await studentRepository.findParentLinkById(tenantId, linkId);
    if (!link || link.tenantId !== tenantId) {
      throw new LoomisError('STUDENT_PARENT_LINK_NOT_FOUND', 404, 'Parent link not found');
    }
    if (link.status === 'active') {
      throw new LoomisError(
        'STUDENT_PARENT_LINK_ALREADY_ACTIVE',
        409,
        'This parent-student link is already active',
      );
    }
    if (link.expiresAt < new Date()) {
      throw new LoomisError('STUDENT_PARENT_LINK_EXPIRED', 410, 'Parent link invitation has expired');
    }
    if (!parentOtpService.verifyOtp(input.otp, link.otpHash)) {
      throw new LoomisError('STUDENT_PARENT_OTP_INVALID', 422, 'Invalid or expired OTP');
    }

    const activated = await studentRepository.activateParentLink(
      link.tenantId,
      linkId,
      'email_otp',
    );
    if (!activated) {
      throw new LoomisError(
        'STUDENT_PARENT_LINK_NOT_FOUND',
        404,
        'Parent link could not be activated',
      );
    }

    await studentRepository.markParentIdentityVerified(link.parentIdentityId, 'email_otp');

    await studentOutboxRepository.publish({
      tenantId: link.tenantId,
      aggregateType: 'parent_link',
      aggregateId: link.id,
      eventType: STUDENT_EVENT_TYPES.PARENT_LINK_VERIFIED,
      payload: {
        tenantId: link.tenantId,
        parentLinkId: link.id,
        parentIdentityId: link.parentIdentityId,
        studentId: link.studentId,
        verifiedByFactor: 'email_otp',
        activatedAt: activated.activatedAt?.toISOString() ?? new Date().toISOString(),
      },
    });

    return serializeParentLink(activated);
  },

  async listParentLinksForStudent(tenantId: string, studentId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    const links = await studentRepository.listParentLinksForStudent(tenantId, studentId);
    return links.map(serializeParentLink);
  },
};
