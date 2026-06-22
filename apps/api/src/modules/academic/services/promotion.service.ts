import { LoomisError } from '../../../shared/errors.js';
import { academicEvents } from '../events/index.js';
import { academicRepository } from '../repository/academic.repository.js';
import { certificateService } from '../../student/services/certificate.service.js';
import { workflowService } from '../../workflow/services/workflow.service.js';
import { workflowRepository } from '../../workflow/repository/workflow.repository.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import type { ActorContext as StudentActorContext } from '../../student/types.js';
import type { ActorContext, StagePromotionInput } from '../types.js';
import { requireTenant, requireYear } from './_shared.js';
import {
  isAdvancedTier,
  mergeExperienceFlags,
  workflowsInboxEnabled,
} from '@loomis/core';
import type { TenantExperienceFlags } from '@loomis/contracts';

/**
 * Student promotion & graduation (FR-ASM-007/008 / US-ASM-005/006).
 *
 * Staging produces the proposed promotion list at year end; confirmation makes
 * the records permanent. Records do not take effect until the next year is
 * activated and a term opened — the Student module reads `confirmed` records to
 * seed the new term's enrollments (consumed via the promotion-confirmed event).
 */
export const promotionService = {
  async stagePromotions(tenantId: string, input: StagePromotionInput, actor: ActorContext) {
    requireTenant(actor, tenantId);
    if (input.fromAcademicYearId === input.toAcademicYearId) {
      throw new LoomisError(
        'ACADEMIC_PROGRESSION_INVALID',
        422,
        'The promotion source and destination years must differ',
      );
    }

    const fromYear = await requireYear(tenantId, input.fromAcademicYearId);
    const toYear = await requireYear(tenantId, input.toAcademicYearId);
    if (toYear.status === 'closed') {
      throw new LoomisError(
        'ACADEMIC_PROGRESSION_INVALID',
        409,
        'The destination academic year is closed',
      );
    }
    if (fromYear.status === 'closed') {
      // Promotion is staged at year end, before/around closure — once archived the
      // proposed list can no longer be (re)staged.
      const existing = await academicRepository.listPromotions(tenantId, input.fromAcademicYearId);
      if (existing.some((r) => r.status === 'confirmed')) {
        throw new LoomisError(
          'ACADEMIC_PROMOTION_ALREADY_CONFIRMED',
          409,
          'Promotions for this year have already been confirmed',
        );
      }
    }

    const records = await academicRepository.stagePromotions(
      tenantId,
      input.fromAcademicYearId,
      input.toAcademicYearId,
      input.decisions,
      actor.userId,
    );

    const tenant = await tenantRepository.findById(tenantId);
    if (tenant) {
      const flags = mergeExperienceFlags(tenant.experienceFlags as TenantExperienceFlags);
      const inboxModule =
        isAdvancedTier(tenant.experienceTier as 'core' | 'advanced' | 'enterprise') &&
        workflowsInboxEnabled(tenant.experienceTier as 'core' | 'advanced' | 'enterprise', flags);

      if (inboxModule) {
        const heldBack = records.filter((r) => r.outcome === 'held_back');
        for (const record of heldBack) {
          const pending = await workflowRepository.countPendingBySubject(
            tenantId,
            'held_back_override',
            record.studentId,
          );
          if (pending > 0) continue;

          await workflowService.startWorkflow({
            workflowType: 'held_back_override',
            tenantId,
            requestedById: actor.userId,
            requestedByRole: actor.role,
            subjectType: 'student',
            subjectId: record.studentId,
            title: `Held back — owner approval required`,
            payload: {
              studentId: record.studentId,
              fromAcademicYearId: input.fromAcademicYearId,
              toAcademicYearId: input.toAcademicYearId,
              heldBackReason: record.heldBackReason,
              promotionRecordId: record.id,
            },
          });
        }
      }
    }

    return records;
  },

  async listPromotions(tenantId: string, fromAcademicYearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return academicRepository.listPromotions(tenantId, fromAcademicYearId);
  },

  /**
   * The Principal confirms the staged promotion list (FR-ASM-007). Confirmed
   * records are permanent. Emits `academic.promotion.confirmed` so the Student
   * module can pre-assign students to their new classes when the next term opens.
   */
  async confirmPromotions(tenantId: string, fromAcademicYearId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    await requireYear(tenantId, fromAcademicYearId);

    const proposed = await academicRepository.listPromotions(tenantId, fromAcademicYearId);
    const staged = proposed.filter((r) => r.status === 'proposed');
    if (staged.length === 0) {
      throw new LoomisError(
        'ACADEMIC_PROMOTION_NOT_FOUND',
        404,
        'There is no staged promotion list to confirm for this year',
      );
    }

    const tenant = await tenantRepository.findById(tenantId);
    if (tenant) {
      const flags = mergeExperienceFlags(tenant.experienceFlags as TenantExperienceFlags);
      const inboxModule =
        isAdvancedTier(tenant.experienceTier as 'core' | 'advanced' | 'enterprise') &&
        workflowsInboxEnabled(tenant.experienceTier as 'core' | 'advanced' | 'enterprise', flags);

      if (inboxModule) {
        const heldBackStudentIds = staged
          .filter((r) => r.outcome === 'held_back')
          .map((r) => r.studentId);
        if (heldBackStudentIds.length > 0) {
          const pending = await workflowRepository.countPendingBySubjects(
            tenantId,
            'held_back_override',
            heldBackStudentIds,
          );
          if (pending > 0) {
            throw new LoomisError(
              'ACADEMIC_HELD_BACK_APPROVAL_PENDING',
              409,
              'Held-back students require School Owner approval in the workflow inbox before promotions can be confirmed',
            );
          }
        }
      }
    }

    const confirmed = await academicRepository.confirmPromotions(
      tenantId,
      fromAcademicYearId,
      actor.userId,
    );

    await certificateService.processConfirmedGraduations(
      tenantId,
      confirmed,
      actor as StudentActorContext,
    );

    const toAcademicYearId = confirmed.find((r) => r.status === 'confirmed')?.toAcademicYearId;
    if (toAcademicYearId) {
      await academicEvents.publishPromotionConfirmed(
        tenantId,
        fromAcademicYearId,
        toAcademicYearId,
        actor.userId,
      );
    }
    return confirmed;
  },
};
