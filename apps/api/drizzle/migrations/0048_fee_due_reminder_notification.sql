-- Add fee_due_reminder notification type for automated and manual fee collection reminders.

ALTER TABLE "comms"."notifications" DROP CONSTRAINT IF EXISTS "notifications_type_valid";--> statement-breakpoint
ALTER TABLE "comms"."notifications"
  ADD CONSTRAINT "notifications_type_valid"
  CHECK ("notification_type" IN (
    'school_announcement', 'class_message', 'parent_reply', 'payment_verified',
    'break_glass_alert', 'assignment_reminder', 'attendance_alert', 'fee_due_reminder', 'generic'
  ));
