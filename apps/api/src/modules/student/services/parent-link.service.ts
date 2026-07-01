import type {
  AcceptParentLinkRequest,
  InitiateParentLinkRequest,
  ParentLinkResponse,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { userRepository } from '../../identity/repository/index.js';
import { STUDENT_EVENT_TYPES } from '../events/types.js';
import { studentOutboxRepository } from '../repository/outbox.repository.js';
import { studentRepository } from '../repository/student.repository.js';
import type { ActorContext } from '../types.js';
import { normalizeEmail, requireTenant } from './_shared.js';

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
   * recorded at initiation; the parent accepts from their portal (no OTP).
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

    const emailNormalized = normalizeEmail(input.parentEmail);
    const existingParentUser = await userRepository.findByEmail(input.parentEmail);
    const parentIdentity = await studentRepository.upsertParentIdentity({
      emailNormalized,
      phoneE164: input.parentPhone,
      fullName: input.parentFullName,
      userId: existingParentUser?.role === 'parent' ? existingParentUser.id : null,
    });

    const link = await studentRepository.createParentLink(
      tenantId,
      parentIdentity.id,
      studentId,
      input,
      actor.userId,
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
   * US-SIS-005. Parent-only — confirms and activates the link. Staff roles
   * are rejected (Admin Officer cannot self-complete, FR-SIS-003).
   */
  async acceptParentLink(
    tenantId: string,
    linkId: string,
    _input: AcceptParentLinkRequest,
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

    const activated = await studentRepository.activateParentLink(
      link.tenantId,
      linkId,
      'parent_accept',
    );
    if (!activated) {
      throw new LoomisError(
        'STUDENT_PARENT_LINK_NOT_FOUND',
        404,
        'Parent link could not be activated',
      );
    }

    await studentRepository.markParentIdentityVerified(link.parentIdentityId, 'parent_accept');

    const identity = await studentRepository.findParentIdentityById(link.parentIdentityId);
    if (!identity) {
      throw new LoomisError('STUDENT_PARENT_LINK_NOT_FOUND', 404, 'Parent identity not found');
    }
    await studentRepository.upsertParentIdentity({
      emailNormalized: identity.emailNormalized,
      phoneE164: identity.phoneE164,
      fullName: identity.fullName,
      userId: actor.userId,
    });

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
        verifiedByFactor: 'parent_accept',
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
