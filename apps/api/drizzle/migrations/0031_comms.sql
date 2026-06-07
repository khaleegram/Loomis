CREATE SCHEMA IF NOT EXISTS "comms";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comms"."messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"parent_message_id" uuid,
	"sender_user_id" uuid NOT NULL,
	"sender_role" varchar(50) NOT NULL,
	"message_type" varchar(25) NOT NULL,
	"class_arm_id" uuid,
	"term_id" uuid,
	"subject" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comms"."notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid NOT NULL,
	"message_id" uuid,
	"notification_type" varchar(30) NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" varchar(500) NOT NULL,
	"deep_link_resource_type" varchar(40) NOT NULL,
	"deep_link_resource_id" uuid NOT NULL,
	"status" varchar(15) DEFAULT 'pending' NOT NULL,
	"delivery_channels" jsonb DEFAULT '{"in_app":"sent"}'::jsonb NOT NULL,
	"event_idempotency_key" varchar(128),
	"read_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comms"."push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"tenant_id" uuid,
	"platform" varchar(10) NOT NULL,
	"provider" varchar(10) NOT NULL,
	"token" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"deregistered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comms"."notification_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"template_key" varchar(60) NOT NULL,
	"channel" varchar(10) NOT NULL,
	"subject_template" varchar(200) NOT NULL,
	"body_template" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comms"."processed_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."notifications" ADD CONSTRAINT "notifications_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "comms"."messages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_device_id_registered_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "identity"."registered_devices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comms"."notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_tenant_thread_idx" ON "comms"."messages" USING btree ("tenant_id","thread_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_tenant_sender_idx" ON "comms"."messages" USING btree ("tenant_id","sender_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_parent_message_id_idx" ON "comms"."messages" USING btree ("parent_message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_status_idx" ON "comms"."notifications" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_tenant_user_idx" ON "comms"."notifications" USING btree ("tenant_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_event_idempotency_key_unique" ON "comms"."notifications" USING btree ("event_idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_user_device_unique" ON "comms"."push_subscriptions" USING btree ("user_id","device_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_active_idx" ON "comms"."push_subscriptions" USING btree ("user_id","active");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_tenant_key_channel_unique" ON "comms"."notification_templates" USING btree ("tenant_id","template_key","channel");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comms_processed_events_event_type_idx" ON "comms"."processed_events" USING btree ("event_type");
