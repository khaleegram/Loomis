-- Custom SQL migration: Website page-view analytics.

CREATE TABLE IF NOT EXISTS "website"."page_views" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL,
  "site_id" uuid NOT NULL,
  "path" varchar(500) DEFAULT '/' NOT NULL,
  "referrer_host" varchar(255),
  "device_type" varchar(20) DEFAULT 'unknown' NOT NULL,
  "daily_visitor_hash" varchar(64) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "website_page_views_tenant_created_at_idx"
  ON "website"."page_views" ("tenant_id", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "website_page_views_site_created_at_idx"
  ON "website"."page_views" ("site_id", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "website_page_views_referrer_host_idx"
  ON "website"."page_views" ("referrer_host");--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "website"."page_views"
   ADD CONSTRAINT "page_views_tenant_id_tenants_id_fk"
   FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "website"."page_views"
   ADD CONSTRAINT "page_views_site_id_sites_id_fk"
   FOREIGN KEY ("site_id") REFERENCES "website"."sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "website"."page_views"
   ADD CONSTRAINT "website_page_views_device_type_valid"
   CHECK ("device_type" IN ('desktop', 'mobile', 'tablet', 'bot', 'unknown'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

ALTER TABLE "website"."page_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website"."page_views" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "website"."page_views";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "website"."page_views"
  AS RESTRICTIVE FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
