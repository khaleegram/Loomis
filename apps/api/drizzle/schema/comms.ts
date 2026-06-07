import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { registeredDevices, users } from './identity';
import { tenants } from './tenant';

export const commsSchema = pgSchema('comms');

export const MESSAGE_TYPES = [
  'school_announcement',
  'class_broadcast',
  'parent_reply',
] as const;

export const NOTIFICATION_TYPES = [
  'school_announcement',
  'class_message',
  'parent_reply',
  'payment_verified',
  'break_glass_alert',
  'assignment_reminder',
  'attendance_alert',
  'generic',
] as const;

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'sms', 'push'] as const;

export const NOTIFICATION_STATUSES = ['pending', 'delivered', 'read', 'failed'] as const;

export const PUSH_PLATFORMS = ['android', 'ios'] as const;

export const PUSH_PROVIDERS = ['fcm', 'apns'] as const;

/**
 * Threaded messages (FR-COM-001 / US-COM-001..003).
 * Message bodies may contain normal content; push/in-app notification copy is separate.
 */
export const messages = commsSchema.table(
  'messages',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    threadId: uuid('thread_id').notNull(),
    parentMessageId: uuid('parent_message_id'),
    senderUserId: uuid('sender_user_id')
      .notNull()
      .references(() => users.id),
    senderRole: varchar('sender_role', { length: 50 }).notNull(),
    messageType: varchar('message_type', { length: 25 }).notNull(),
    classArmId: uuid('class_arm_id'),
    termId: uuid('term_id'),
    subject: varchar('subject', { length: 200 }).notNull(),
    body: text('body').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantThreadIdx: index('messages_tenant_thread_idx').on(table.tenantId, table.threadId),
    tenantSenderIdx: index('messages_tenant_sender_idx').on(table.tenantId, table.senderUserId),
    parentMessageIdx: index('messages_parent_message_id_idx').on(table.parentMessageId),
    typeValid: check(
      'messages_type_valid',
      sql`${table.messageType} IN ('school_announcement', 'class_broadcast', 'parent_reply')`,
    ),
  }),
);

/**
 * Notifications (FR-COM-002). Bodies must be PII-safe — validated in the service layer.
 */
export const notifications = commsSchema.table(
  'notifications',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    messageId: uuid('message_id').references(() => messages.id),
    notificationType: varchar('notification_type', { length: 30 }).notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    body: varchar('body', { length: 500 }).notNull(),
    deepLinkResourceType: varchar('deep_link_resource_type', { length: 40 }).notNull(),
    deepLinkResourceId: uuid('deep_link_resource_id').notNull(),
    status: varchar('status', { length: 15 }).notNull().default('pending'),
    deliveryChannels: jsonb('delivery_channels')
      .$type<Record<string, 'pending' | 'sent' | 'failed' | 'skipped'>>()
      .notNull()
      .default({ in_app: 'sent' }),
    eventIdempotencyKey: varchar('event_idempotency_key', { length: 128 }),
    readAt: timestamp('read_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index('notifications_user_status_idx').on(table.userId, table.status),
    tenantUserIdx: index('notifications_tenant_user_idx').on(table.tenantId, table.userId),
    idempotencyUnique: uniqueIndex('notifications_event_idempotency_key_unique').on(
      table.eventIdempotencyKey,
    ),
    typeValid: check(
      'notifications_type_valid',
      sql`${table.notificationType} IN (
        'school_announcement', 'class_message', 'parent_reply', 'payment_verified',
        'break_glass_alert', 'assignment_reminder', 'attendance_alert', 'generic'
      )`,
    ),
    statusValid: check(
      'notifications_status_valid',
      sql`${table.status} IN ('pending', 'delivered', 'read', 'failed')`,
    ),
  }),
);

/**
 * FCM/APNs device tokens (System Design §18.4 / US-COM-004).
 */
export const pushSubscriptions = commsSchema.table(
  'push_subscriptions',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => registeredDevices.id),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    platform: varchar('platform', { length: 10 }).notNull(),
    provider: varchar('provider', { length: 10 }).notNull(),
    token: text('token').notNull(),
    active: boolean('active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    deregisteredAt: timestamp('deregistered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDeviceUnique: uniqueIndex('push_subscriptions_user_device_unique').on(
      table.userId,
      table.deviceId,
    ),
    userActiveIdx: index('push_subscriptions_user_active_idx').on(table.userId, table.active),
    platformValid: check(
      'push_subscriptions_platform_valid',
      sql`${table.platform} IN ('android', 'ios')`,
    ),
    providerValid: check(
      'push_subscriptions_provider_valid',
      sql`${table.provider} IN ('fcm', 'apns')`,
    ),
  }),
);

/**
 * Configurable notification templates per tenant (SRS §10.3).
 */
export const notificationTemplates = commsSchema.table(
  'notification_templates',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tenantId: uuid('tenant_id').references(() => tenants.id),
    templateKey: varchar('template_key', { length: 60 }).notNull(),
    channel: varchar('channel', { length: 10 }).notNull(),
    subjectTemplate: varchar('subject_template', { length: 200 }).notNull(),
    bodyTemplate: varchar('body_template', { length: 500 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantKeyChannelUnique: uniqueIndex('notification_templates_tenant_key_channel_unique').on(
      table.tenantId,
      table.templateKey,
      table.channel,
    ),
    channelValid: check(
      'notification_templates_channel_valid',
      sql`${table.channel} IN ('in_app', 'email', 'sms', 'push')`,
    ),
  }),
);

/** Idempotent domain-event consumption for automated notifications. */
export const commsProcessedEvents = commsSchema.table(
  'processed_events',
  {
    eventId: uuid('event_id').primaryKey(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventTypeIdx: index('comms_processed_events_event_type_idx').on(table.eventType),
  }),
);
