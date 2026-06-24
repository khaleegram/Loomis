CREATE SCHEMA IF NOT EXISTS "compliance";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance"."consent_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"version_label" varchar(40) NOT NULL,
	"privacy_policy_hash" varchar(128) NOT NULL,
	"content_summary" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"published_by_id" uuid NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance"."retention_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"data_category" varchar(40) NOT NULL,
	"retention_days" integer NOT NULL,
	"anonymise_only" boolean DEFAULT false NOT NULL,
	"description" text NOT NULL,
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance"."dsars" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"requester_type" varchar(20) NOT NULL,
	"requester_user_id" uuid,
	"subject_user_id" uuid,
	"subject_identifiers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_deadline_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"responded_by_id" uuid,
	"data_package_json" jsonb,
	"data_package_object_id" uuid,
	"redaction_notes" text,
	"escalation_day21_sent_at" timestamp with time zone,
	"escalation_day28_sent_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance"."breach_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"discovered_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by_id" uuid,
	"ndpc_notification_required" boolean,
	"ndpc_notification_draft" jsonb,
	"ndpc_notified_at" timestamp with time zone,
	"ndpc_notification_outcome" text,
	"ndpc_deadline_at" timestamp with time zone,
	"breach_type" varchar(60) NOT NULL,
	"affected_data_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_subject_count" integer DEFAULT 0 NOT NULL,
	"likely_cause" text NOT NULL,
	"containment_measures" text NOT NULL,
	"status" varchar(20) DEFAULT 'suspected' NOT NULL,
	"assigned_dpo_id" uuid,
	"escalation_48h_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance"."retention_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"schedule_id" uuid NOT NULL,
	"data_category" varchar(40) NOT NULL,
	"tenant_id" uuid,
	"target_schema" varchar(40) NOT NULL,
	"target_table" varchar(60) NOT NULL,
	"target_record_id" uuid NOT NULL,
	"action" varchar(15) NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance"."dsars" ADD CONSTRAINT "dsars_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance"."breach_records" ADD CONSTRAINT "breach_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance"."retention_events" ADD CONSTRAINT "retention_events_schedule_id_retention_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "compliance"."retention_schedules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance"."retention_events" ADD CONSTRAINT "retention_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "consent_versions_version_label_unique" ON "compliance"."consent_versions" ("version_label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_versions_active_idx" ON "compliance"."consent_versions" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "retention_schedules_data_category_unique" ON "compliance"."retention_schedules" ("data_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dsars_status_deadline_idx" ON "compliance"."dsars" ("status", "response_deadline_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dsars_tenant_status_idx" ON "compliance"."dsars" ("tenant_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "breach_records_status_discovered_idx" ON "compliance"."breach_records" ("status", "discovered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "breach_records_ndpc_deadline_idx" ON "compliance"."breach_records" ("ndpc_deadline_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retention_events_category_action_idx" ON "compliance"."retention_events" ("data_category", "action", "performed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retention_events_target_record_idx" ON "compliance"."retention_events" ("target_schema", "target_table", "target_record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retention_events_hard_delete_eligible_idx" ON "compliance"."retention_events" ("action", "performed_at");--> statement-breakpoint
INSERT INTO "compliance"."retention_schedules" ("id", "data_category", "retention_days", "anonymise_only", "description")
VALUES
  ('01930000000070000000000000000001', 'student_records', 2555, false, 'Student records retained 7 years after graduation or withdrawal'),
  ('01930000000070000000000000000002', 'financial_records', 2555, true, 'Financial records retained 7 years; PII anonymised, amounts retained'),
  ('01930000000070000000000000000003', 'audit_logs', 1825, false, 'Audit logs retained minimum 5 years'),
  ('01930000000070000000000000000004', 'parent_pii', 1095, false, 'Parent PII retained 3 years after last activity'),
  ('01930000000070000000000000000005', 'staff_pii', 1095, false, 'Staff PII retained 3 years after deactivation'),
  ('01930000000070000000000000000006', 'admission_records', 1095, false, 'Declined/withdrawn admission records retained 3 years')
ON CONFLICT DO NOTHING;
