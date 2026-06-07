-- Custom SQL migration: Risk / IVP CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "risk"."ivp_signal_snapshots"
   ADD CONSTRAINT "ivp_signal_snapshots_signal_type_valid"
   CHECK ("signal_type" IN (
     'attendance_anomaly', 'gradebook_anomaly', 'payment_volume',
     'device_count', 'parent_link'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "risk"."ivp_anomaly_cases"
   ADD CONSTRAINT "ivp_anomaly_cases_status_valid"
   CHECK ("case_status" IN (
     'OPEN', 'INVESTIGATING', 'RESOLVED_EXPLAINED',
     'RESOLVED_CORRECTED', 'RESOLVED_ENFORCED', 'DISMISSED'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "risk"."ivp_anomaly_cases"
   ADD CONSTRAINT "ivp_anomaly_cases_priority_valid"
   CHECK ("priority" IN ('watchlist', 'standard', 'urgent'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "risk"."privileged_change_requests"
   ADD CONSTRAINT "privileged_change_requests_change_type_valid"
   CHECK ("change_type" IN (
     'psf_rate_override', 'psf_waiver', 'ledger_adjustment',
     'tenant_suspension_override', 'referral_rule_change',
     'support_impersonation', 'data_export'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "risk"."privileged_change_requests"
   ADD CONSTRAINT "privileged_change_requests_status_valid"
   CHECK ("status" IN ('requested', 'approved', 'rejected', 'executed', 'expired'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "risk"."break_glass_sessions"
   ADD CONSTRAINT "break_glass_sessions_status_valid"
   CHECK ("status" IN ('active', 'expired', 'revoked'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "risk"."ivp_signal_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "risk"."ivp_signal_snapshots" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "risk"."ivp_signal_snapshots";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "risk"."ivp_signal_snapshots"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "risk"."ivp_anomaly_cases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "risk"."ivp_anomaly_cases" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "risk"."ivp_anomaly_cases";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "risk"."ivp_anomaly_cases"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "risk"."break_glass_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "risk"."break_glass_sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "risk"."break_glass_sessions";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "risk"."break_glass_sessions"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
