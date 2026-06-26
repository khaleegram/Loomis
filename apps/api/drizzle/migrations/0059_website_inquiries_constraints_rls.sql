-- Custom SQL migration: Website inquiries CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "website"."inquiries"
   ADD CONSTRAINT "website_inquiries_type_valid"
   CHECK ("type" IN ('contact', 'admission_interest'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "website"."inquiries"
   ADD CONSTRAINT "website_inquiries_status_valid"
   CHECK ("status" IN ('new', 'read', 'archived'));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

ALTER TABLE "website"."inquiries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website"."inquiries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "website"."inquiries";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "website"."inquiries"
  AS RESTRICTIVE FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
