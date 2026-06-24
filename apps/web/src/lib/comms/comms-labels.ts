import type { NotificationType } from '@loomis/contracts';

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  school_announcement: 'Announcement',
  class_message: 'Class message',
  parent_reply: 'Parent reply',
  payment_verified: 'Payment',
  break_glass_alert: 'Security alert',
  assignment_reminder: 'Assignment',
  fee_due_reminder: 'Fee reminder',
  attendance_alert: 'Attendance',
  generic: 'Notice',
};

export function formatNotificationType(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}
