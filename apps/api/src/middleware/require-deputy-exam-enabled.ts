import type { FastifyReply, FastifyRequest } from 'fastify';
import { mergeExperienceFlags } from '@loomis/core';
import { examOpsService } from '../modules/academic/services/exam-ops.service.js';
import { tenantRepository } from '../modules/tenant/repository/tenant.repository.js';
import { LoomisError } from '../shared/errors.js';

function tenantIdFromRequest(req: FastifyRequest): string | null {
  const params = req.params as { tenantId?: string };
  return params.tenantId ?? req.authUser?.tenantId ?? null;
}

/**
 * Blocks deputy_exam_officer when the feature flag is off (Core default).
 * Exam Officer primary role is unaffected.
 */
export function requireDeputyExamEnabled() {
  return async function requireDeputyExamEnabledHandler(
    req: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = req.authUser;
    if (!user || user.role !== 'deputy_exam_officer') return;

    const tenantId = tenantIdFromRequest(req);
    if (!tenantId) {
      throw new LoomisError('FORBIDDEN', 403, 'Tenant context required');
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    const flags = mergeExperienceFlags(tenant.experienceFlags);
    if (!flags.deputyExamEnabled) {
      throw new LoomisError(
        'EXAM_DEPUTY_DISABLED',
        403,
        'Deputy Exam Officer is not enabled for this school',
      );
    }

    await examOpsService.assertDeputyActivated(tenantId);
  };
}
