import { eq } from 'drizzle-orm';
import { messages } from '../../../../drizzle/schema/comms.js';
import { studentRepository } from '../../student/repository/student.repository.js';
import { writeAudit } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import { withTenantContext } from '../../../shared/tenant-context.js';
import { messageRepository, notificationRepository, recipientRepository } from '../repository/index.js';
import { deliveryService } from './delivery.service.js';
import type {
  ActorContext,
  ReplyToMessageInput,
  SendAnnouncementInput,
  SendClassMessageInput,
  SendStudentParentMessageInput,
} from '../types.js';
import { ANNOUNCEMENT_ROLES, PARENT_MESSAGE_ROLES, SAFE_NOTIFICATION_COPY } from '../types.js';

function requireTenant(actor: ActorContext, tenantId: string): void {
  if (actor.tenantId !== null && actor.tenantId !== tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
  }
}

export const messageService = {
  async sendAnnouncement(
    tenantId: string,
    input: SendAnnouncementInput,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    if (!ANNOUNCEMENT_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Not authorised to send announcements');
    }
    if (actor.role === 'admin_officer' && input.audience === 'all') {
      throw new LoomisError(
        'FORBIDDEN',
        403,
        'Admin Officers may broadcast to staff and parents only',
      );
    }

    return withTenantContext(tenantId, async (tx) => {
      const created = await messageRepository.create(tx, {
        tenantId,
        threadId: crypto.randomUUID(),
        senderUserId: actor.userId,
        senderRole: actor.role,
        messageType: 'school_announcement',
        subject: input.subject,
        body: input.body,
      });

      await tx
        .update(messages)
        .set({ threadId: created.id })
        .where(eq(messages.id, created.id));

      const message = { ...created, threadId: created.id };
      const recipientIds = await recipientRepository.announcementRecipientUserIds(
        tx,
        tenantId,
        input.audience,
      );

      for (const userId of recipientIds) {
        await deliveryService.createAndDeliver({
          tenantId,
          userId,
          notificationType: 'school_announcement',
          safeCopy: SAFE_NOTIFICATION_COPY.schoolAnnouncement,
          resourceId: message.id,
          messageId: message.id,
          requestId,
          actorUserId: actor.userId,
        });
      }

      await writeAudit({
        tenantId,
        actorUserId: actor.userId,
        action: 'comms.announcement.sent',
        resourceType: 'message',
        resourceId: message.id,
        sensitivity: 'standard',
        result: 'success',
        requestId,
        metadata: { recipientCount: recipientIds.length },
      });

      return message;
    });
  },

  async sendClassMessage(
    tenantId: string,
    input: SendClassMessageInput,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    if (actor.role !== 'class_teacher') {
      throw new LoomisError('FORBIDDEN', 403, 'Only Class Teachers can send class messages');
    }

    return withTenantContext(tenantId, async (tx) => {
      const authorised = await recipientRepository.isClassTeacherForArm(
        tx,
        tenantId,
        actor.userId,
        input.termId,
        input.classArmId,
      );
      if (!authorised) {
        throw new LoomisError(
          'COMMS_CLASS_ARM_FORBIDDEN',
          403,
          'You are not the Class Teacher for this class arm',
        );
      }

      const created = await messageRepository.create(tx, {
        tenantId,
        threadId: crypto.randomUUID(),
        senderUserId: actor.userId,
        senderRole: actor.role,
        messageType: 'class_broadcast',
        classArmId: input.classArmId,
        termId: input.termId,
        subject: input.subject,
        body: input.body,
      });

      await tx
        .update(messages)
        .set({ threadId: created.id })
        .where(eq(messages.id, created.id));

      const message = { ...created, threadId: created.id };

      let parentUserIds: string[];
      if (input.studentIds?.length) {
        const matched = await recipientRepository.countStudentsInClassArm(
          tx,
          tenantId,
          input.termId,
          input.classArmId,
          input.studentIds,
        );
        if (matched !== input.studentIds.length) {
          throw new LoomisError(
            'COMMS_STUDENT_NOT_IN_CLASS',
            422,
            'All selected students must be actively enrolled in this class for the term',
          );
        }
        parentUserIds = await recipientRepository.parentUserIdsForStudentsInClassArm(
          tx,
          tenantId,
          input.termId,
          input.classArmId,
          input.studentIds,
        );
      } else {
        parentUserIds = await recipientRepository.parentUserIdsForClassArm(
          tx,
          tenantId,
          input.termId,
          input.classArmId,
        );
      }

      if (parentUserIds.length === 0) {
        throw new LoomisError(
          'COMMS_NO_RECIPIENTS',
          422,
          'No linked parent accounts found for the selected recipients',
        );
      }

      for (const userId of parentUserIds) {
        await deliveryService.createAndDeliver({
          tenantId,
          userId,
          notificationType: 'class_message',
          safeCopy: SAFE_NOTIFICATION_COPY.classMessage,
          resourceId: message.id,
          messageId: message.id,
          requestId,
          actorUserId: actor.userId,
        });
      }

      await writeAudit({
        tenantId,
        actorUserId: actor.userId,
        action: 'comms.class_message.sent',
        resourceType: 'message',
        resourceId: message.id,
        sensitivity: 'standard',
        result: 'success',
        requestId,
        metadata: {
          recipientCount: parentUserIds.length,
          classArmId: input.classArmId,
          studentCount: input.studentIds?.length ?? null,
        },
      });

      return message;
    });
  },

  async sendStudentParentMessage(
    tenantId: string,
    input: SendStudentParentMessageInput,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    if (!PARENT_MESSAGE_ROLES.has(actor.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Not authorised to message parents');
    }

    const enrollment = await studentRepository.findEnrollmentForTerm(
      tenantId,
      input.studentId,
      input.termId,
    );
    if (!enrollment || !['active', 'active_billable'].includes(enrollment.status)) {
      throw new LoomisError(
        'COMMS_STUDENT_NOT_ENROLLED',
        422,
        'Student is not actively enrolled for this term',
      );
    }

    return withTenantContext(tenantId, async (tx) => {
      if (actor.role === 'class_teacher') {
        const authorised = await recipientRepository.isClassTeacherForArm(
          tx,
          tenantId,
          actor.userId,
          input.termId,
          enrollment.classArmId,
        );
        if (!authorised) {
          throw new LoomisError(
            'COMMS_CLASS_ARM_FORBIDDEN',
            403,
            'You are not the Class Teacher for this student\'s class',
          );
        }
      }

      const parentUserIds = await recipientRepository.parentUserIdsForStudent(
        tx,
        tenantId,
        input.studentId,
      );
      if (parentUserIds.length === 0) {
        throw new LoomisError(
          'COMMS_NO_RECIPIENTS',
          422,
          'No linked parent accounts found for this student',
        );
      }

      const created = await messageRepository.create(tx, {
        tenantId,
        threadId: crypto.randomUUID(),
        senderUserId: actor.userId,
        senderRole: actor.role,
        messageType: 'class_broadcast',
        classArmId: enrollment.classArmId,
        termId: input.termId,
        subject: input.subject,
        body: input.body,
      });

      await tx
        .update(messages)
        .set({ threadId: created.id })
        .where(eq(messages.id, created.id));

      const message = { ...created, threadId: created.id };

      for (const userId of parentUserIds) {
        await deliveryService.createAndDeliver({
          tenantId,
          userId,
          notificationType: 'class_message',
          safeCopy: SAFE_NOTIFICATION_COPY.classMessage,
          resourceId: message.id,
          messageId: message.id,
          requestId,
          actorUserId: actor.userId,
        });
      }

      await writeAudit({
        tenantId,
        actorUserId: actor.userId,
        action: 'comms.student_parent_message.sent',
        resourceType: 'message',
        resourceId: message.id,
        sensitivity: 'standard',
        result: 'success',
        requestId,
        metadata: {
          recipientCount: parentUserIds.length,
          studentId: input.studentId,
          classArmId: enrollment.classArmId,
        },
      });

      return message;
    });
  },

  async replyToMessage(
    tenantId: string,
    parentMessageId: string,
    input: ReplyToMessageInput,
    actor: ActorContext,
    requestId: string,
  ) {
    requireTenant(actor, tenantId);
    if (actor.role !== 'parent') {
      throw new LoomisError(
        'COMMS_REPLY_NOT_ALLOWED',
        403,
        'Only parents can reply via this endpoint; parents may reply only to received messages',
      );
    }

    return withTenantContext(tenantId, async (tx) => {
      const parentMessage = await messageRepository.findById(tx, tenantId, parentMessageId);
      if (!parentMessage) {
        throw new LoomisError('COMMS_MESSAGE_NOT_FOUND', 404, 'Message not found');
      }

      if (parentMessage.messageType === 'parent_reply') {
        throw new LoomisError(
          'COMMS_REPLY_NOT_ALLOWED',
          403,
          'Parents cannot initiate new threads — reply to a received message only',
        );
      }

      const received = await notificationRepository.userReceivedMessage(
        tx,
        actor.userId,
        parentMessageId,
      );
      if (!received) {
        throw new LoomisError(
          'COMMS_REPLY_NOT_ALLOWED',
          403,
          'You may only reply to messages you have received',
        );
      }

      const reply = await messageRepository.create(tx, {
        tenantId,
        threadId: parentMessage.threadId,
        parentMessageId,
        senderUserId: actor.userId,
        senderRole: actor.role,
        messageType: 'parent_reply',
        classArmId: parentMessage.classArmId,
        termId: parentMessage.termId,
        subject: `Re: ${parentMessage.subject}`,
        body: input.body,
      });

      await deliveryService.createAndDeliver({
        tenantId,
        userId: parentMessage.senderUserId,
        notificationType: 'parent_reply',
        safeCopy: SAFE_NOTIFICATION_COPY.parentReply,
        resourceId: reply.id,
        messageId: reply.id,
        requestId,
        actorUserId: actor.userId,
      });

      await writeAudit({
        tenantId,
        actorUserId: actor.userId,
        action: 'comms.message.replied',
        resourceType: 'message',
        resourceId: reply.id,
        sensitivity: 'standard',
        result: 'success',
        requestId,
      });

      return reply;
    });
  },

  async getThread(tenantId: string, threadId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return withTenantContext(tenantId, async (tx) => {
      const rows = await messageRepository.listThread(tx, tenantId, threadId);
      if (rows.length === 0) {
        throw new LoomisError('COMMS_MESSAGE_NOT_FOUND', 404, 'Thread not found');
      }
      return rows;
    });
  },

  async getMessage(tenantId: string, messageId: string, actor: ActorContext) {
    requireTenant(actor, tenantId);
    return withTenantContext(tenantId, async (tx) => {
      const row = await messageRepository.findById(tx, tenantId, messageId);
      if (!row) {
        throw new LoomisError('COMMS_MESSAGE_NOT_FOUND', 404, 'Message not found');
      }
      return row;
    });
  },
};
