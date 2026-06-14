import { withTenantContext } from '../../../shared/tenant-context.js';
import { FINANCE_EVENT_TYPES } from '../../finance/events/types.js';
import { ACADEMIC_OPS_EVENT_TYPES } from '../../academic/events/ops-events.js';
import { RISK_EVENT_TYPES } from '@loomis/contracts';
import { processedEventsRepository, recipientRepository } from '../repository/index.js';
import { deliveryService } from './delivery.service.js';
import { SAFE_NOTIFICATION_COPY } from '../types.js';

interface OutboxEnvelope {
  event_id: string;
  payload: Record<string, unknown>;
}

export const automatedNotificationService = {
  async handlePaymentVerified(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      paymentId: string;
      studentId: string;
    };

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        FINANCE_EVENT_TYPES.paymentVerified,
      );
      if (!claimed) return;

      const parentUserIds = await recipientRepository.parentUserIdsForStudent(
        tx,
        payload.tenantId,
        payload.studentId,
      );

      for (const userId of parentUserIds) {
        await deliveryService.createAndDeliver({
          tenantId: payload.tenantId,
          userId,
          notificationType: 'payment_verified',
          safeCopy: SAFE_NOTIFICATION_COPY.paymentVerified,
          resourceId: payload.paymentId,
          eventIdempotencyKey: `payment-verified:${payload.paymentId}:${userId}`,
          channels: ['push', 'email'],
        });
      }
    });
  },

  async handleBreakGlassActivated(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      sessionId: string;
      schoolOwnerUserId?: string | null;
    };
    const ownerUserId = payload.schoolOwnerUserId;
    if (!ownerUserId) return;

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        RISK_EVENT_TYPES.breakGlassActivated,
      );
      if (!claimed) return;
    });

    await deliveryService.createAndDeliver({
      tenantId: payload.tenantId,
      userId: ownerUserId,
      notificationType: 'break_glass_alert',
      safeCopy: SAFE_NOTIFICATION_COPY.breakGlassAlert,
      resourceId: payload.sessionId,
      eventIdempotencyKey: `break-glass:${payload.sessionId}`,
      channels: ['push', 'email', 'sms'],
    });
  },

  async handleAssignmentPublished(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      assignmentId: string;
      classArmId: string;
    };

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        ACADEMIC_OPS_EVENT_TYPES.assignmentPublished,
      );
      if (!claimed) return;

      const parentUserIds = await recipientRepository.parentUserIdsForClassArmOnly(
        tx,
        payload.tenantId,
        payload.classArmId,
      );

      for (const userId of parentUserIds) {
        await deliveryService.createAndDeliver({
          tenantId: payload.tenantId,
          userId,
          notificationType: 'assignment_reminder',
          safeCopy: SAFE_NOTIFICATION_COPY.assignmentReminder,
          resourceId: payload.assignmentId,
          eventIdempotencyKey: `assignment-published:${payload.assignmentId}:${userId}`,
          channels: ['push'],
        });
      }
    });
  },

  async handleAttendanceMarked(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      attendanceDate: string;
      session: string;
      absentStudentIds: string[];
    };

    if (!payload.absentStudentIds?.length) return;

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        ACADEMIC_OPS_EVENT_TYPES.attendanceMarked,
      );
      if (!claimed) return;

      for (const studentId of payload.absentStudentIds) {
        const parentUserIds = await recipientRepository.parentUserIdsForStudent(
          tx,
          payload.tenantId,
          studentId,
        );

        for (const userId of parentUserIds) {
          await deliveryService.createAndDeliver({
            tenantId: payload.tenantId,
            userId,
            notificationType: 'attendance_alert',
            safeCopy: SAFE_NOTIFICATION_COPY.attendanceAbsent,
            resourceId: studentId,
            eventIdempotencyKey: `attendance-absent:${studentId}:${payload.attendanceDate}:${payload.session}:${userId}`,
            channels: ['push'],
          });
        }
      }
    });
  },

  async handleAttendanceAmended(event: OutboxEnvelope): Promise<void> {
    const payload = event.payload as {
      tenantId: string;
      studentId: string;
      attendanceDate: string;
      session: string;
      previousStatus: string;
      newStatus: string;
    };

    if (payload.newStatus !== 'absent' || payload.previousStatus === 'absent') return;

    await withTenantContext(payload.tenantId, async (tx) => {
      const claimed = await processedEventsRepository.claim(
        tx,
        event.event_id,
        ACADEMIC_OPS_EVENT_TYPES.attendanceAmended,
      );
      if (!claimed) return;

      const parentUserIds = await recipientRepository.parentUserIdsForStudent(
        tx,
        payload.tenantId,
        payload.studentId,
      );

      for (const userId of parentUserIds) {
        await deliveryService.createAndDeliver({
          tenantId: payload.tenantId,
          userId,
          notificationType: 'attendance_alert',
          safeCopy: SAFE_NOTIFICATION_COPY.attendanceAbsent,
          resourceId: payload.studentId,
          eventIdempotencyKey: `attendance-absent-amended:${payload.studentId}:${payload.attendanceDate}:${payload.session}:${userId}`,
          channels: ['push'],
        });
      }
    });
  },
};
