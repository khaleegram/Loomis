CREATE SCHEMA "tenant";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant"."configurations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant"."psf_rate_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scope" varchar(10) NOT NULL,
	"tenant_id" uuid,
	"rate_minor" bigint NOT NULL,
	"previous_rate_minor" bigint,
	"effective_from" timestamp with time zone NOT NULL,
	"reason" varchar(500),
	"changed_by_id" uuid NOT NULL,
	"approved_by_id" uuid,
	"workflow_instance_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant"."tenants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"region" varchar(100) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"address" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'provisioning' NOT NULL,
	"tier_id" uuid NOT NULL,
	"referral_code" varchar(64),
	"provisioned_by_id" uuid,
	"suspended_reason" varchar(500),
	"suspended_at" timestamp with time zone,
	"suspended_by_id" uuid,
	"reinstated_at" timestamp with time zone,
	"reinstated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant"."tiers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"default_psf_rate_minor" bigint NOT NULL,
	"max_students" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant"."configurations" ADD CONSTRAINT "configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant"."psf_rate_snapshots" ADD CONSTRAINT "psf_rate_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant"."tenants" ADD CONSTRAINT "tenants_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "tenant"."tiers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "configurations_tenant_id_key_unique" ON "tenant"."configurations" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "psf_rate_snapshots_scope_tenant_id_idx" ON "tenant"."psf_rate_snapshots" USING btree ("scope","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenant"."tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenants_region_idx" ON "tenant"."tenants" USING btree ("region");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tiers_code_unique" ON "tenant"."tiers" USING btree ("code");