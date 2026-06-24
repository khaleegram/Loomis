import type { Role } from '@loomis/contracts';
import type {
  RegisterPushSubscriptionRequest,
  ReplyToMessageRequest,
  SendAnnouncementRequest,
  SendClassMessageRequest,
  SendStudentParentMessageRequest,
  UpsertNotificationTemplateRequest,
} from '@loomis/contracts';

export interface ActorContext {
  userId: string;
  role: Role;
  tenantId: string | null;
}

export type SendAnnouncementInput = SendAnnouncementRequest;
export type SendClassMessageInput = SendClassMessageRequest;
export type SendStudentParentMessageInput = SendStudentParentMessageRequest;
export type ReplyToMessageInput = ReplyToMessageRequest;

export const PARENT_MESSAGE_ROLES = new Set([
  'school_owner',
  'principal',
  'admin_officer',
  'class_teacher',
  'exam_officer',
  'deputy_exam_officer',
]);

/** Staff roles that may broadcast to an entire class arm without a class-teacher assignment. */
export const CLASS_PARENT_BROADCAST_ROLES = new Set([
  'school_owner',
  'principal',
  'admin_officer',
  'exam_officer',
  'deputy_exam_officer',
]);
export type RegisterPushSubscriptionInput = RegisterPushSubscriptionRequest;
export type UpsertNotificationTemplateInput = UpsertNotificationTemplateRequest;

export interface SafeNotificationCopy {
  title: string;
  body: string;
  deepLinkResourceType: string;
}

/** Pre-approved opaque notification copy — no PII, grades, or amounts (loomis-security). */
export const SAFE_NOTIFICATION_COPY = {
  schoolAnnouncement: {
    title: 'School announcement',
    body: 'A new announcement is available. Tap to read.',
    deepLinkResourceType: 'announcement',
  },
  classMessage: {
    title: 'New class message',
    body: 'You have a new message from your class teacher. Tap to read.',
    deepLinkResourceType: 'message',
  },
  parentReply: {
    title: 'Parent reply',
    body: 'A parent replied to your message. Tap to read.',
    deepLinkResourceType: 'message',
  },
  paymentVerified: {
    title: 'Payment confirmed',
    body: 'A payment was confirmed. Open the app for details.',
    deepLinkResourceType: 'payment',
  },
  breakGlassAlert: {
    title: 'Support access alert',
    body: 'Platform support access was activated for your school. Review immediately.',
    deepLinkResourceType: 'security',
  },
  assignmentReminder: {
    title: 'Assignment reminder',
    body: 'You have an upcoming assignment deadline. Tap to view.',
    deepLinkResourceType: 'assignment',
  },
  attendanceAbsent: {
    title: 'Attendance update',
    body: 'Your child was marked absent today. Open the app for details.',
    deepLinkResourceType: 'attendance',
  },
  newMessage: {
    title: 'New message',
    body: 'You have a new school message. Tap to read.',
    deepLinkResourceType: 'message',
  },
} as const satisfies Record<string, SafeNotificationCopy>;

export interface OutboxEventInput {
  tenantId: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export const ANNOUNCEMENT_ROLES = new Set(['school_owner', 'principal', 'admin_officer']);
