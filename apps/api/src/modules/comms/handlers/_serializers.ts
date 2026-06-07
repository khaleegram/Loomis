import type {
  MessageResponse,
  NotificationResponse,
  NotificationTemplateResponse,
  PushSubscriptionResponse,
} from '@loomis/contracts';

type MessageRow = {
  id: string;
  tenantId: string;
  threadId: string;
  parentMessageId: string | null;
  senderUserId: string;
  senderRole: string;
  messageType: string;
  classArmId: string | null;
  termId: string | null;
  subject: string;
  body: string;
  sentAt: Date;
  createdAt: Date;
};

type NotificationRow = {
  id: string;
  tenantId: string | null;
  userId: string;
  messageId: string | null;
  notificationType: string;
  title: string;
  body: string;
  deepLinkResourceType: string;
  deepLinkResourceId: string;
  status: string;
  deliveryChannels: Record<string, 'pending' | 'sent' | 'failed' | 'skipped'>;
  readAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
};

export function messageToResponse(row: MessageRow): MessageResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    threadId: row.threadId,
    parentMessageId: row.parentMessageId,
    senderUserId: row.senderUserId,
    senderRole: row.senderRole,
    messageType: row.messageType as MessageResponse['messageType'],
    classArmId: row.classArmId,
    termId: row.termId,
    subject: row.subject,
    body: row.body,
    sentAt: row.sentAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function notificationToResponse(row: NotificationRow): NotificationResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    messageId: row.messageId,
    notificationType: row.notificationType as NotificationResponse['notificationType'],
    title: row.title,
    body: row.body,
    deepLinkResourceType: row.deepLinkResourceType,
    deepLinkResourceId: row.deepLinkResourceId,
    status: row.status as NotificationResponse['status'],
    deliveryChannels: row.deliveryChannels,
    readAt: row.readAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function pushSubscriptionToResponse(row: {
  id: string;
  userId: string;
  deviceId: string;
  tenantId: string | null;
  platform: string;
  provider: string;
  active: boolean;
  createdAt: Date;
}): PushSubscriptionResponse {
  return {
    id: row.id,
    userId: row.userId,
    deviceId: row.deviceId,
    tenantId: row.tenantId,
    platform: row.platform as PushSubscriptionResponse['platform'],
    provider: row.provider as PushSubscriptionResponse['provider'],
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

export function templateToResponse(row: {
  id: string;
  tenantId: string | null;
  templateKey: string;
  channel: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
}): NotificationTemplateResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    templateKey: row.templateKey,
    channel: row.channel as NotificationTemplateResponse['channel'],
    subjectTemplate: row.subjectTemplate,
    bodyTemplate: row.bodyTemplate,
    isActive: row.isActive,
  };
}
