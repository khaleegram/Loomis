-- Custom SQL migration: Referral programme CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "referral"."participants"
   ADD CONSTRAINT "participants_type_valid"
   CHECK ("participant_type" IN ('regional_manager', 'regional_subordinate'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."participants"
   ADD CONSTRAINT "participants_status_valid"
   CHECK ("status" IN ('pending_kyc', 'active', 'deactivated'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."kyc_records"
   ADD CONSTRAINT "kyc_records_status_valid"
   CHECK ("status" IN ('pending', 'approved', 'rejected'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."referral_codes"
   ADD CONSTRAINT "referral_codes_status_valid"
   CHECK ("status" IN ('pending', 'active', 'revoked'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."attributions"
   ADD CONSTRAINT "attributions_onboarding_source_valid"
   CHECK ("onboarding_source" IN (
     'manager_direct', 'subordinate', 'self_registration', 'platform'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."attributions"
   ADD CONSTRAINT "attributions_status_valid"
   CHECK ("status" IN ('active', 'flagged', 'held', 'forfeited'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries"
   ADD CONSTRAINT "earning_entries_amount_positive"
   CHECK ("amount_minor" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries"
   ADD CONSTRAINT "earning_entries_psf_settled_positive"
   CHECK ("psf_settled_amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries"
   ADD CONSTRAINT "earning_entries_type_valid"
   CHECK ("earning_type" IN ('direct', 'manager_override'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries"
   ADD CONSTRAINT "earning_entries_status_valid"
   CHECK ("status" IN (
     'accrued', 'held', 'eligible', 'paid', 'forfeited', 'carried_forward'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "referral"."payout_cycles"
   ADD CONSTRAINT "payout_cycles_status_valid"
   CHECK ("status" IN ('open', 'computing', 'closed', 'disbursed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "referral"."attributions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral"."attributions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "referral"."attributions";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "referral"."attributions"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "referral"."earning_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral"."earning_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "referral"."earning_entries";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "referral"."earning_entries"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

DROP POLICY IF EXISTS "platform_read" ON "referral"."attributions";--> statement-breakpoint
CREATE POLICY "platform_read" ON "referral"."attributions"
  AS PERMISSIVE
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');--> statement-breakpoint

DROP POLICY IF EXISTS "platform_read" ON "referral"."earning_entries";--> statement-breakpoint
CREATE POLICY "platform_read" ON "referral"."earning_entries"
  AS PERMISSIVE
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');
