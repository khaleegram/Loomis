import type { ExamOpsStatusResponse } from '@loomis/contracts';
import {
  hoursUntilDeputyExamActivation,
  hoursUntilEmergencyPublishEscalation,
  isDeputyExamOfficerActivated,
  isEmergencyPublishEscalationActive,
  mergeExperienceFlags,
} from '@loomis/core';

import { sessionRepository } from '../../identity/repository/session.repository.js';
import { staffRepository } from '../../hrm/repository/staff.repository.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { LoomisError } from '../../../shared/errors.js';

export const examOpsService = {
  async getStatus(tenantId: string): Promise<ExamOpsStatusResponse> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    const flags = mergeExperienceFlags(tenant.experienceFlags);
    const examOfficerUserId = await staffRepository.findActivePrimaryUserIdForRole(
      tenantId,
      'exam_officer',
    );
    const deputyUserId = await staffRepository.findActivePrimaryUserIdForRole(
      tenantId,
      'deputy_exam_officer',
    );

    const examOfficerLastActiveAt = examOfficerUserId
      ? await sessionRepository.findLatestLastActiveAt(examOfficerUserId)
      : null;

    const deputyActivated =
      flags.deputyExamEnabled &&
      deputyUserId != null &&
      isDeputyExamOfficerActivated(examOfficerLastActiveAt);

    const emergencyEscalationActive =
      flags.deputyExamEnabled && isEmergencyPublishEscalationActive(examOfficerLastActiveAt);

    return {
      deputyExamEnabled: flags.deputyExamEnabled,
      deputyActivated,
      hasExamOfficer: examOfficerUserId != null,
      hasDeputyExamOfficer: deputyUserId != null,
      examOfficerLastActiveAt: examOfficerLastActiveAt?.toISOString() ?? null,
      hoursUntilDeputyActivation: flags.deputyExamEnabled
        ? hoursUntilDeputyExamActivation(examOfficerLastActiveAt)
        : 0,
      emergencyEscalationActive,
      hoursUntilEmergencyEscalation: flags.deputyExamEnabled
        ? hoursUntilEmergencyPublishEscalation(examOfficerLastActiveAt)
        : 0,
    };
  },

  async assertPrincipalEmergencyPublish(tenantId: string): Promise<void> {
    const status = await this.getStatus(tenantId);
    if (!status.emergencyEscalationActive) {
      throw new LoomisError(
        'EXAM_EMERGENCY_PUBLISH_INACTIVE',
        403,
        'Principal may publish results only during an active emergency escalation',
        { hoursUntilEmergencyEscalation: status.hoursUntilEmergencyEscalation },
      );
    }
  },

  async assertDeputyActivated(tenantId: string): Promise<void> {
    const status = await this.getStatus(tenantId);
    if (!status.deputyExamEnabled) {
      throw new LoomisError(
        'EXAM_DEPUTY_DISABLED',
        403,
        'Deputy Exam Officer is not enabled for this school',
      );
    }
    if (!status.deputyActivated) {
      throw new LoomisError(
        'EXAM_DEPUTY_NOT_ACTIVATED',
        403,
        'Deputy Exam Officer is not active until the Exam Officer has been inactive for 72 hours',
        { hoursUntilDeputyActivation: status.hoursUntilDeputyActivation },
      );
    }
  },
};
