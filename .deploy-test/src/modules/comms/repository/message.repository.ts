import { and, desc, eq } from 'drizzle-orm';
import { messages } from '../../../../drizzle/schema/comms.js';
import type { Executor } from '../../../shared/db.js';
import type { MessageType } from '@loomis/contracts';

export const messageRepository = {
  async create(
    tx: Executor,
    input: {
      tenantId: string;
      threadId: string;
      parentMessageId?: string | null;
      senderUserId: string;
      senderRole: string;
      messageType: MessageType;
      classArmId?: string | null;
      termId?: string | null;
      subject: string;
      body: string;
    },
  ) {
    const [row] = await tx
      .insert(messages)
      .values({
        tenantId: input.tenantId,
        threadId: input.threadId,
        parentMessageId: input.parentMessageId ?? null,
        senderUserId: input.senderUserId,
        senderRole: input.senderRole,
        messageType: input.messageType,
        classArmId: input.classArmId ?? null,
        termId: input.termId ?? null,
        subject: input.subject,
        body: input.body,
      })
      .returning();
    if (!row) throw new Error('Failed to create message');
    return row;
  },

  async findById(tx: Executor, tenantId: string, messageId: string) {
    const [row] = await tx
      .select()
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.id, messageId)))
      .limit(1);
    return row ?? null;
  },

  async listThread(tx: Executor, tenantId: string, threadId: string) {
    return tx
      .select()
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.threadId, threadId)))
      .orderBy(messages.sentAt);
  },

  async listInboxForUser(tx: Executor, tenantId: string, userId: string) {
    return tx
      .select()
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.senderUserId, userId)))
      .orderBy(desc(messages.sentAt));
  },
};
