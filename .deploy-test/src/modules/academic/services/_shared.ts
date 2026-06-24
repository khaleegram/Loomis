import { LoomisError } from '../../../shared/errors.js';
import { academicRepository } from '../repository/academic.repository.js';
import type { ActorContext } from '../types.js';

/** Defense in depth beyond requireTenantMatch: the actor must own the tenant. */
export function requireTenant(actor: ActorContext, tenantId: string): void {
  if (actor.tenantId !== null && actor.tenantId !== tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
  }
}

export async function requireYear(tenantId: string, yearId: string) {
  const year = await academicRepository.findYearById(tenantId, yearId);
  if (!year) {
    throw new LoomisError('ACADEMIC_YEAR_NOT_FOUND', 404, 'Academic year not found');
  }
  return year;
}

export async function requireTerm(tenantId: string, termId: string) {
  const term = await academicRepository.findTermById(tenantId, termId);
  if (!term) {
    throw new LoomisError('ACADEMIC_TERM_NOT_FOUND', 404, 'Academic term not found');
  }
  return term;
}
