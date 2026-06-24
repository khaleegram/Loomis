-- Custom SQL migration: refund_requests + reconciliation_exceptions CHECK
-- constraints and RLS (loomis-database, loomis-financial-integrity, loomis-security).

-- ── refund_requests CHECK constraints ────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "finance"."refund_requests"
   ADD CONSTRAINT "refund_requests_amount_positive" CHECK ("amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."refund_requests"
   ADD CONSTRAINT "refund_requests_reason_valid"
   CHECK ("reason_code" IN (
     'duplicate', 'overpayment', 'student_withdrawal',
     'service_failure', 'chargeback', 'platform_error', 'legal_compulsion'
   ));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."refund_requests"
   ADD CONSTRAINT "refund_requests_psf_treatment_valid"
   CHECK ("psf_treatment" IN ('not_reversed', 'reversal_pending', 'reversed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."refund_requests"
   ADD CONSTRAINT "refund_requests_status_valid"
   CHECK ("status" IN ('pending', 'approved', 'rejected', 'executed', 'cancelled'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── reconciliation_exceptions CHECK constraints ──────────────────────────────

DO $$ BEGIN
 ALTER TABLE "finance"."reconciliation_exceptions"
   ADD CONSTRAINT "reconciliation_exceptions_provider_valid"
   CHECK ("provider" IN ('paystack'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."reconciliation_exceptions"
   ADD CONSTRAINT "reconciliation_exceptions_type_valid"
   CHECK ("exception_type" IN ('gateway_only', 'platform_only', 'amount_mismatch'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."reconciliation_exceptions"
   ADD CONSTRAINT "reconciliation_exceptions_status_valid"
   CHECK ("status" IN ('open', 'resolved', 'ignored'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE "finance"."refund_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."refund_requests" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."refund_requests";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."refund_requests"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "finance"."reconciliation_exceptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."reconciliation_exceptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."reconciliation_exceptions";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."reconciliation_exceptions"
  AS RESTRICTIVE
  FOR ALL
  USING (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
