CREATE SCHEMA IF NOT EXISTS "website";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website"."sites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(80) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"template_id" varchar(50) DEFAULT 'prestige' NOT NULL,
	"theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_snapshot_id" uuid,
	"published_at" timestamp with time zone,
	"published_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website"."publish_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"template_id" varchar(50) NOT NULL,
	"theme" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"seo" jsonb NOT NULL,
	"published_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "website_sites_tenant_id_unique" ON "website"."sites" ("tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "website_sites_slug_unique" ON "website"."sites" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "website_sites_status_idx" ON "website"."sites" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "website_publish_snapshots_site_version_unique" ON "website"."publish_snapshots" ("site_id","version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "website_publish_snapshots_site_id_idx" ON "website"."publish_snapshots" ("site_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."publish_snapshots" ADD CONSTRAINT "publish_snapshots_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "website"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."publish_snapshots" ADD CONSTRAINT "publish_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
