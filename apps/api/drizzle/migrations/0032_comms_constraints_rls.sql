-- Custom SQL migration: Comms CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "comms"."messages"
   ADD CONSTRAINT "messages_type_valid"
   CHECK ("message_type" IN ('school_announcement', 'class_broadcast', 'parent_reply'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "comms"."notifications"
   ADD CONSTRAINT "notifications_type_valid"
   CHECK ("notification_type" IN (
     'school_announcement', 'class_message', 'parent_reply', 'payment_verified',
     'break_glass_alert', 'assignment_reminder', 'attendance_alert', 'generic'
   ));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "comms"."notifications"
   ADD CONSTRAINT "notifications_status_valid"
   CHECK ("status" IN ('pending', 'delivered', 'read', 'failed'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "comms"."push_subscriptions"
   ADD CONSTRAINT "push_subscriptions_platform_valid"
   CHECK ("platform" IN ('android', 'ios'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "comms"."push_subscriptions"
   ADD CONSTRAINT "push_subscriptions_provider_valid"
   CHECK ("provider" IN ('fcm', 'apns'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "comms"."notification_templates"
   ADD CONSTRAINT "notification_templates_channel_valid"
   CHECK ("channel" IN ('in_app', 'email', 'sms', 'push'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

ALTER TABLE "comms"."messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comms"."messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "comms"."messages";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "comms"."messages"
  AS RESTRICTIVE FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "comms"."notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comms"."notifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "comms"."notifications";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "comms"."notifications"
  AS RESTRICTIVE FOR ALL
  USING (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint

DROP POLICY IF EXISTS "platform_read" ON "comms"."notifications";--> statement-breakpoint
CREATE POLICY "platform_read" ON "comms"."notifications"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');
