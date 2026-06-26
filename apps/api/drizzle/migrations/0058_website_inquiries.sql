CREATE TABLE IF NOT EXISTS "website"."inquiries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"submitter_name" varchar(200) NOT NULL,
	"submitter_email" varchar(255) NOT NULL,
	"submitter_phone" varchar(20),
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"admission_id" uuid,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "website_inquiries_tenant_id_idx" ON "website"."inquiries" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "website_inquiries_site_id_idx" ON "website"."inquiries" ("site_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "website_inquiries_status_idx" ON "website"."inquiries" ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "website_inquiries_created_at_idx" ON "website"."inquiries" ("created_at");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."inquiries" ADD CONSTRAINT "inquiries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."inquiries" ADD CONSTRAINT "inquiries_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "website"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
