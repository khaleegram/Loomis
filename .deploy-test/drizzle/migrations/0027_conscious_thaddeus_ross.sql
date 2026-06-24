CREATE SCHEMA "risk";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk"."break_glass_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"support_user_id" uuid NOT NULL,
	"support_ticket_id" varchar(64) NOT NULL,
	"status" varchar(15) DEFAULT 'active' NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"owner_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk"."ivp_anomaly_cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reported_enrollment" integer NOT NULL,
	"estimated_min" integer NOT NULL,
	"estimated_max" integer NOT NULL,
	"anomaly_score_milli" integer NOT NULL,
	"priority" varchar(10) DEFAULT 'standard' NOT NULL,
	"signals_analyzed" jsonb NOT NULL,
	"case_status" varchar(25) DEFAULT 'OPEN' NOT NULL,
	"assigned_to_id" uuid,
	"resolution_notes" text,
	"resolved_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk"."ivp_signal_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"snapshot_date" varchar(10) NOT NULL,
	"signal_type" varchar(35) NOT NULL,
	"signal_value" bigint NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk"."privileged_change_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"change_type" varchar(35) NOT NULL,
	"target_tenant_id" uuid,
	"requested_by_user_id" uuid NOT NULL,
	"approved_by_user_id" uuid,
	"status" varchar(15) DEFAULT 'requested' NOT NULL,
	"before_json" jsonb NOT NULL,
	"after_json" jsonb NOT NULL,
	"reason" text NOT NULL,
	"risk_score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk"."break_glass_sessions" ADD CONSTRAINT "break_glass_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk"."ivp_anomaly_cases" ADD CONSTRAINT "ivp_anomaly_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk"."ivp_signal_snapshots" ADD CONSTRAINT "ivp_signal_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk"."privileged_change_requests" ADD CONSTRAINT "privileged_change_requests_target_tenant_id_tenants_id_fk" FOREIGN KEY ("target_tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_glass_sessions_tenant_status_idx" ON "risk"."break_glass_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_glass_sessions_support_user_idx" ON "risk"."break_glass_sessions" USING btree ("support_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ivp_anomaly_cases_tenant_status_idx" ON "risk"."ivp_anomaly_cases" USING btree ("tenant_id","case_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ivp_anomaly_cases_score_idx" ON "risk"."ivp_anomaly_cases" USING btree ("anomaly_score_milli");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ivp_anomaly_cases_term_status_idx" ON "risk"."ivp_anomaly_cases" USING btree ("term_id","case_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ivp_signal_snapshots_tenant_term_date_type_unique" ON "risk"."ivp_signal_snapshots" USING btree ("tenant_id","term_id","snapshot_date","signal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ivp_signal_snapshots_tenant_date_idx" ON "risk"."ivp_signal_snapshots" USING btree ("tenant_id","snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "privileged_change_requests_type_status_idx" ON "risk"."privileged_change_requests" USING btree ("change_type","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "privileged_change_requests_tenant_idx" ON "risk"."privileged_change_requests" USING btree ("target_tenant_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "privileged_change_requests_requester_idx" ON "risk"."privileged_change_requests" USING btree ("requested_by_user_id","created_at");