-- Custom SQL migration: Student CHECK constraints and RLS.
-- drizzle-kit 0.24 does not emit these database invariants.

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "student"."admissions"
   ADD CONSTRAINT "admissions_status_valid"
   CHECK ("status" IN ('pending', 'approved', 'declined', 'withdrawn'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."admissions"
   ADD CONSTRAINT "admissions_gender_valid"
   CHECK ("gender" IN ('male', 'female', 'other', 'unknown'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."students"
   ADD CONSTRAINT "students_status_valid"
   CHECK ("status" IN ('admitted', 'enrolled', 'graduated', 'transferred_out', 'withdrawn'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."students"
   ADD CONSTRAINT "students_gender_valid"
   CHECK ("gender" IN ('male', 'female', 'other', 'unknown'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."students"
   ADD CONSTRAINT "students_attestation_type_valid"
   CHECK (
     "identity_attestation_type" IS NULL
     OR "identity_attestation_type" IN (
       'birth_certificate', 'previous_school_record', 'admission_photograph', 'parent_consent'
     )
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."enrollments"
   ADD CONSTRAINT "enrollments_status_valid"
   CHECK ("status" IN ('active', 'active_billable', 'suspended', 'withdrawn', 'transferred', 'graduated'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."enrollments"
   ADD CONSTRAINT "enrollments_end_reason_valid"
   CHECK (
     "end_reason" IS NULL
     OR "end_reason" IN ('transfer', 'withdrawal', 'graduation', 'suspension')
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."parent_identities"
   ADD CONSTRAINT "parent_identities_status_valid"
   CHECK ("status" IN ('unverified', 'verified', 'recovery_locked', 'suspended'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."parent_links"
   ADD CONSTRAINT "parent_links_relationship_valid"
   CHECK ("relationship" IN ('mother', 'father', 'guardian', 'sponsor', 'other'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."parent_links"
   ADD CONSTRAINT "parent_links_status_valid"
   CHECK ("status" IN (
     'initiated', 'school_attested', 'parent_verified', 'active',
     'rejected', 'revoked', 'expired'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."parent_links"
   ADD CONSTRAINT "parent_links_verified_factor_valid"
   CHECK (
     "verified_by_factor" IS NULL
     OR "verified_by_factor" IN ('email_otp', 'phone_otp', 'document_review', 'platform_manual')
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Row-Level Security (CON-001 / CON-002 tenant isolation) ───────────────────
-- parent_identities is global (no tenant_id) — application-layer access control.

ALTER TABLE "student"."admissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student"."admissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "student"."admissions";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "student"."admissions"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "student"."students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student"."students" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "student"."students";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "student"."students"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "student"."enrollments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student"."enrollments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "student"."enrollments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "student"."enrollments"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "student"."parent_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student"."parent_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "student"."parent_links";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "student"."parent_links"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
