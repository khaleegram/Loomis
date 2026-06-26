-- Custom SQL migration: Website CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "website"."sites"
   ADD CONSTRAINT "website_sites_status_valid"
   CHECK ("status" IN ('draft', 'published', 'unpublished'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "website"."sites"
   ADD CONSTRAINT "website_sites_slug_format"
   CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

ALTER TABLE "website"."sites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website"."sites" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "website"."sites";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "website"."sites"
  AS RESTRICTIVE FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint
DROP POLICY IF EXISTS "platform_read" ON "website"."sites";--> statement-breakpoint
CREATE POLICY "platform_read" ON "website"."sites"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');--> statement-breakpoint

ALTER TABLE "website"."publish_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website"."publish_snapshots" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "website"."publish_snapshots";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "website"."publish_snapshots"
  AS RESTRICTIVE FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint
DROP POLICY IF EXISTS "platform_read" ON "website"."publish_snapshots";--> statement-breakpoint
CREATE POLICY "platform_read" ON "website"."publish_snapshots"
  AS PERMISSIVE FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');
