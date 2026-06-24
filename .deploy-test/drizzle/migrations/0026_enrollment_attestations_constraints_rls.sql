-- Custom SQL migration: enrollment_attestations CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "student"."enrollment_attestations"
   ADD CONSTRAINT "enrollment_attestations_rate_positive"
   CHECK ("psf_rate_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."enrollment_attestations"
   ADD CONSTRAINT "enrollment_attestations_status_valid"
   CHECK ("attestation_status" IN ('submitted', 'verified', 'disputed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "student"."enrollment_attestations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student"."enrollment_attestations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "student"."enrollment_attestations";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "student"."enrollment_attestations"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
