import { z } from 'zod';

export const messageType = z.enum(['school_announcement', 'class_broadcast', 'parent_reply']);
export type MessageType = z.infer<typeof messageType>;

export const notificationType = z.enum([
  'school_announcement',
  'class_message',
  'parent_reply',
  'payment_verified',
  'break_glass_alert',
  'assignment_reminder',
  'attendance_alert',
  'generic',
]);
export type NotificationType = z.infer<typeof notificationType>;

export const notificationChannel = z.enum(['in_app', 'email', 'sms', 'push']);
export type NotificationChannel = z.infer<typeof notificationChannel>;

export const notificationStatus = z.enum(['pending', 'delivered', 'read', 'failed']);
export type NotificationStatus = z.infer<typeof notificationStatus>;

export const pushPlatform = z.enum(['android', 'ios', 'web']);
export type PushPlatform = z.infer<typeof pushPlatform>;

export const COMMS_EVENT_TYPES = {
  notificationSent: 'notification.sent',
  messageSent: 'comms.message.sent',
  accountCredentialsEmail: 'comms.account_credentials.email',
} as const;

export const emailDeliverySkipReason = z.enum(['SES_NOT_CONFIGURED', 'SEND_FAILED']);
export type EmailDeliverySkipReason = z.infer<typeof emailDeliverySkipReason>;

/** Result of a one-time credentials email (staff onboarding / student portal). */
export const emailDeliveryResult = z.object({
  sent: z.boolean(),
  /** Masked or full recipient — only populated when an send was attempted or skipped due to config. */
  recipient: z.string().email().optional(),
  reason: emailDeliverySkipReason.optional(),
});
export type EmailDeliveryResult = z.infer<typeof emailDeliveryResult>;

export const sendAnnouncementRequest = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  audience: z.enum(['all', 'staff_and_parents']),
});
export type SendAnnouncementRequest = z.infer<typeof sendAnnouncementRequest>;

export const sendClassMessageRequest = z.object({
  termId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  /** When set, deliver only to parents of these enrolled students (same class arm). */
  studentIds: z.array(z.string().uuid()).min(1).max(50).optional(),
});
export type SendClassMessageRequest = z.infer<typeof sendClassMessageRequest>;

/** Message parents of a single enrolled student (class teacher or staff with parent.message). */
export const sendStudentParentMessageRequest = z.object({
  termId: z.string().uuid(),
  studentId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
});
export type SendStudentParentMessageRequest = z.infer<typeof sendStudentParentMessageRequest>;

export const replyToMessageRequest = z.object({
  body: z.string().min(1).max(10_000),
});
export type ReplyToMessageRequest = z.infer<typeof replyToMessageRequest>;

export const registerPushSubscriptionRequest = z.object({
  deviceId: z.string().uuid(),
  tenantId: z.string().uuid().nullable().optional(),
  platform: pushPlatform,
  token: z.string().min(1).max(4096),
});
export type RegisterPushSubscriptionRequest = z.infer<typeof registerPushSubscriptionRequest>;

export const upsertNotificationTemplateRequest = z.object({
  subjectTemplate: z.string().min(1).max(200),
  bodyTemplate: z.string().min(1).max(500),
  isActive: z.boolean().default(true),
});
export type UpsertNotificationTemplateRequest = z.infer<typeof upsertNotificationTemplateRequest>;

export const messageResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  threadId: z.string().uuid(),
  parentMessageId: z.string().uuid().nullable(),
  senderUserId: z.string().uuid(),
  senderRole: z.string(),
  messageType: messageType,
  classArmId: z.string().uuid().nullable(),
  termId: z.string().uuid().nullable(),
  subject: z.string(),
  body: z.string(),
  sentAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type MessageResponse = z.infer<typeof messageResponse>;

export const notificationResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  messageId: z.string().uuid().nullable(),
  notificationType: notificationType,
  title: z.string(),
  body: z.string(),
  deepLinkResourceType: z.string(),
  deepLinkResourceId: z.string().uuid(),
  status: notificationStatus,
  deliveryChannels: z.record(z.enum(['pending', 'sent', 'failed', 'skipped'])),
  readAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type NotificationResponse = z.infer<typeof notificationResponse>;

export const pushSubscriptionResponse = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  platform: pushPlatform,
  provider: z.enum(['fcm', 'apns', 'webpush']),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});
export type PushSubscriptionResponse = z.infer<typeof pushSubscriptionResponse>;

export const webPushConfigResponse = z.object({
  webPushEnabled: z.boolean(),
  vapidPublicKey: z.string().nullable(),
});
export type WebPushConfigResponse = z.infer<typeof webPushConfigResponse>;

export const notificationTemplateResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  templateKey: z.string(),
  channel: notificationChannel,
  subjectTemplate: z.string(),
  bodyTemplate: z.string(),
  isActive: z.boolean(),
});
export type NotificationTemplateResponse = z.infer<typeof notificationTemplateResponse>;
