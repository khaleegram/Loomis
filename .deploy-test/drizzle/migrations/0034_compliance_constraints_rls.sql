-- Custom SQL migration: Compliance CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "compliance"."dsars"
   ADD CONSTRAINT "dsars_requester_type_valid"
   CHECK ("requester_type" IN ('parent', 'student', 'staff', 'other'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "compliance"."dsars"
   ADD CONSTRAINT "dsars_status_valid"
   CHECK ("status" IN ('received', 'in_progress', 'responded', 'rejected'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "compliance"."breach_records"
   ADD CONSTRAINT "breach_records_status_valid"
   CHECK ("status" IN ('suspected', 'confirmed', 'contained', 'ndpc_notified', 'closed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "compliance"."retention_schedules"
   ADD CONSTRAINT "retention_schedules_retention_days_positive"
   CHECK ("retention_days" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "compliance"."retention_schedules"
   ADD CONSTRAINT "retention_schedules_category_valid"
   CHECK ("data_category" IN (
     'student_records', 'financial_records', 'audit_logs',
     'parent_pii', 'staff_pii', 'admission_records'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "compliance"."retention_events"
   ADD CONSTRAINT "retention_events_action_valid"
   CHECK ("action" IN ('anonymised', 'hard_deleted'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "compliance"."dsars" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "compliance"."dsars" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "compliance"."dsars";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "compliance"."dsars"
  AS RESTRICTIVE
  FOR ALL
  USING (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
DROP POLICY IF EXISTS "platform_read" ON "compliance"."dsars";--> statement-breakpoint
CREATE POLICY "platform_read" ON "compliance"."dsars"
  AS PERMISSIVE
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');--> statement-breakpoint

ALTER TABLE "compliance"."breach_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "compliance"."breach_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "compliance"."breach_records";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "compliance"."breach_records"
  AS RESTRICTIVE
  FOR ALL
  USING (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
DROP POLICY IF EXISTS "platform_read" ON "compliance"."breach_records";--> statement-breakpoint
CREATE POLICY "platform_read" ON "compliance"."breach_records"
  AS PERMISSIVE
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');--> statement-breakpoint

ALTER TABLE "compliance"."retention_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "compliance"."retention_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "compliance"."retention_events";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "compliance"."retention_events"
  AS RESTRICTIVE
  FOR ALL
  USING (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );--> statement-breakpoint
DROP POLICY IF EXISTS "platform_read" ON "compliance"."retention_events";--> statement-breakpoint
CREATE POLICY "platform_read" ON "compliance"."retention_events"
  AS PERMISSIVE
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');
