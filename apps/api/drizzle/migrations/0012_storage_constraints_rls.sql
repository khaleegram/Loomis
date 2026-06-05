-- Custom SQL migration: Storage CHECK constraints and RLS (SRS §10.5; SEC-DAT-008).

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "storage"."storage_objects"
   ADD CONSTRAINT "storage_objects_classification_valid"
   CHECK ("classification" IN ('public_tenant','internal','pii','child_pii','financial','exam'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "storage"."storage_objects"
   ADD CONSTRAINT "storage_objects_status_valid"
   CHECK ("status" IN ('upload_pending','available','quarantined'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "storage"."storage_objects"
   ADD CONSTRAINT "storage_objects_content_length_positive"
   CHECK ("content_length_bytes" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Row-Level Security (CON-001 tenant isolation) ─────────────────────────────

ALTER TABLE "storage"."storage_objects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "storage"."storage_objects" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "storage"."storage_objects";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "storage"."storage_objects"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
