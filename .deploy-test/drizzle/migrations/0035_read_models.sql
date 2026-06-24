CREATE SCHEMA IF NOT EXISTS "read_models";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "read_models"."parent_child_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"parent_user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"school_name" varchar(200) NOT NULL,
	"student_first_name" varchar(100) NOT NULL,
	"class_arm_label" varchar(80),
	"attendance_summary" jsonb DEFAULT '{"presentCount":0,"totalCount":0,"lastStatus":null}'::jsonb NOT NULL,
	"latest_result_summary" jsonb,
	"outstanding_balance_minor" bigint DEFAULT 0 NOT NULL,
	"unread_message_count" integer DEFAULT 0 NOT NULL,
	"link_status" varchar(25) DEFAULT 'active' NOT NULL,
	"last_refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "read_models"."regional_tenant_analytics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"region" varchar(100) NOT NULL,
	"snapshot_date" varchar(10) NOT NULL,
	"total_students" integer DEFAULT 0 NOT NULL,
	"active_enrollments" integer DEFAULT 0 NOT NULL,
	"attendance_rate_milli" integer DEFAULT 0 NOT NULL,
	"fee_collection_rate_milli" integer DEFAULT 0 NOT NULL,
	"fee_collected_minor" bigint DEFAULT 0 NOT NULL,
	"psf_collected_minor" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "read_models"."processed_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "read_models"."parent_child_cards" ADD CONSTRAINT "parent_child_cards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "read_models"."regional_tenant_analytics" ADD CONSTRAINT "regional_tenant_analytics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parent_child_cards_parent_tenant_student_unique" ON "read_models"."parent_child_cards" ("parent_user_id","tenant_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_child_cards_parent_user_idx" ON "read_models"."parent_child_cards" ("parent_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "regional_tenant_analytics_tenant_date_unique" ON "read_models"."regional_tenant_analytics" ("tenant_id","snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "regional_tenant_analytics_region_date_idx" ON "read_models"."regional_tenant_analytics" ("region","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "read_models_processed_events_event_unique" ON "read_models"."processed_events" ("event_id");
