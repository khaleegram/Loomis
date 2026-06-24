import { isPortalEnrollmentStatus } from '@loomis/core';
import { LoomisError } from '../../../shared/errors.js';
import { studentRepository } from '../repository/student.repository.js';
import type { ActorContext } from '../types.js';

/** Parent portal APIs — parent JWT role only (students use tenant-scoped self routes). */
export function assertParentRole(actor: ActorContext): void {
  if (actor.role !== 'parent') {
    throw new LoomisError('FORBIDDEN', 403, 'Parent role required');
  }
}

/**
 * Single gate for parent-child portal access: active link + optional term enrollment.
 */
export async function assertParentPortalAccess(
  tenantId: string,
  studentId: string,
  actor: ActorContext,
  opts?: { termId?: string },
): Promise<void> {
  assertParentRole(actor);

  const linked = await studentRepository.hasActiveParentLink(tenantId, actor.userId, studentId);
  if (!linked) {
    throw new LoomisError('FORBIDDEN', 403, 'You are not linked to this student');
  }

  if (opts?.termId) {
    const enrollment = await studentRepository.findEnrollmentForTerm(
      tenantId,
      studentId,
      opts.termId,
    );
    if (!enrollment || !isPortalEnrollmentStatus(enrollment.status)) {
      throw new LoomisError('STUDENT_ENROLLMENT_NOT_FOUND', 404, 'No active enrollment for this term');
    }
  }
}
