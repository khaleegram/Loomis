import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { deliveryService } from '../../comms/services/delivery.service.js';
import { SAFE_NOTIFICATION_COPY } from '../../comms/types.js';
import { recipientRepository } from '../../comms/repository/index.js';
import { academicRepository } from '../../academic/repository/academic.repository.js';
import { tenantRepository } from '../../tenant/repository/tenant.repository.js';
import { financeRepository } from '../repository/finance.repository.js';
import type { ActorContext } from '../types.js';
import { requireTenant } from './_shared.js';
import { feeReminderSettingsService } from './fee-reminder-settings.service.js';
import {
  buildFeeReminderIdempotencyKey,
  evaluateFeeReminderTriggers,
  reminderChannelsForTrigger,
  type FeeReminderTrigger,
} from './fee-reminder.utils.js';

async function notifyParentsForStudent(
  tenantId: string,
  studentId: string,
  trigger: FeeReminderTrigger,
  idempotencySuffix: string,
): Promise<number> {
  const parentUserIds = await withTenantContext(tenantId, async (tx) =>
    recipientRepository.parentUserIdsForStudent(tx, tenantId, studentId),
  );

  if (parentUserIds.length === 0) return 0;

  const channels = reminderChannelsForTrigger(trigger);
  const inputs = parentUserIds.map((userId) => ({
    tenantId,
    userId,
    notificationType: 'fee_due_reminder' as const,
    safeCopy: SAFE_NOTIFICATION_COPY.feeDueReminder,
    resourceId: studentId,
    eventIdempotencyKey: buildFeeReminderIdempotencyKey({
      trigger,
      tenantId,
      studentId,
      userId,
      suffix: idempotencySuffix,
    }),
  }));

  const created = await deliveryService.createManyInApp(inputs);
  deliveryService.scheduleExternalDeliveries(
    created.map((notification) => ({
      notificationId: notification.id,
      userId: notification.userId,
      tenantId: notification.tenantId,
      title: notification.title,
      body: notification.body,
      deepLinkResourceType: notification.deepLinkResourceType,
      deepLinkResourceId: notification.deepLinkResourceId,
      channels,
    })),
  );

  return parentUserIds.length;
}

export const feeReminderService = {
  async remindStudentNow(
    tenantId: string,
    studentId: string,
    actor: ActorContext,
  ): Promise<{ remindedParentCount: number }> {
    requireTenant(actor, tenantId);

    const totalBalance = await financeRepository.sumStudentBalanceMinor(tenantId, studentId);
    if (totalBalance <= 0) {
      throw new LoomisError('VALIDATION_ERROR', 422, 'This student has no outstanding balance');
    }

    const remindedParentCount = await notifyParentsForStudent(
      tenantId,
      studentId,
      'manual',
      `${actor.userId}:${Date.now()}`,
    );

    return { remindedParentCount };
  },

  async remindStudentsBulk(
    tenantId: string,
    studentIds: string[],
    actor: ActorContext,
  ): Promise<{ remindedStudentCount: number; remindedParentCount: number }> {
    requireTenant(actor, tenantId);

    let remindedStudentCount = 0;
    let remindedParentCount = 0;

    for (const studentId of studentIds) {
      const balance = await financeRepository.sumStudentBalanceMinor(tenantId, studentId);
      if (balance <= 0) continue;
      const count = await notifyParentsForStudent(
        tenantId,
        studentId,
        'manual',
        `${actor.userId}:bulk:${Date.now()}:${studentId}`,
      );
      if (count > 0) {
        remindedStudentCount += 1;
        remindedParentCount += count;
      }
    }

    return { remindedStudentCount, remindedParentCount };
  },

  /** Daily job: standard preset reminders for all tenants. */
  async runScheduledReminders(asOfDate?: string): Promise<{
    tenantsScanned: number;
    remindersSent: number;
    skipped: number;
  }> {
    const today = asOfDate ?? new Date().toISOString().slice(0, 10);
    const tenants = await tenantRepository.listAll();
    let remindersSent = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      const { preset } = await feeReminderSettingsService.getSettings(tenant.id);
      const slices = await financeRepository.listOutstandingInvoicesWithTerm(tenant.id);
      const seen = new Set<string>();

      for (const slice of slices) {
        const term = await academicRepository.findTermById(tenant.id, slice.termId);
        const triggers = evaluateFeeReminderTriggers({
          today,
          termStartDate: term?.startDate ?? slice.termStartDate,
          dueDate: slice.dueDate,
          preset,
        });

        for (const trigger of triggers) {
          const dedupeKey = `${trigger}:${slice.studentId}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          const count = await notifyParentsForStudent(
            tenant.id,
            slice.studentId,
            trigger,
            `${trigger}:${today}`,
          );
          if (count > 0) remindersSent += 1;
          else skipped += 1;
        }
      }
    }

    return { tenantsScanned: tenants.length, remindersSent, skipped };
  },
};
