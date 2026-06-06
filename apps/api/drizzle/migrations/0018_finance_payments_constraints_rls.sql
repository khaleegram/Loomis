-- Custom SQL migration: Finance payments CHECK constraints and RLS
-- (loomis-database, loomis-financial-integrity, loomis-security).

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "finance"."payments"
   ADD CONSTRAINT "payments_channel_valid"
   CHECK ("channel" IN ('offline', 'online'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."payments"
   ADD CONSTRAINT "payments_amount_positive" CHECK ("amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."payments"
   ADD CONSTRAINT "payments_status_valid"
   CHECK ("status" IN ('pending_verification', 'pending', 'verified', 'failed', 'cancelled'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."receipts"
   ADD CONSTRAINT "receipts_status_valid"
   CHECK ("status" IN ('provisional', 'final'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."receipts"
   ADD CONSTRAINT "receipts_amount_positive" CHECK ("amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."receipts"
   ADD CONSTRAINT "receipts_sequence_positive" CHECK ("sequence_number" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."webhook_events"
   ADD CONSTRAINT "webhook_events_provider_valid"
   CHECK ("provider" IN ('paystack', 'flutterwave'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."webhook_events"
   ADD CONSTRAINT "webhook_events_status_valid"
   CHECK ("status" IN ('received', 'processed', 'duplicate', 'rejected'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Row-Level Security (tenant-bound tables only) ────────────────────────────
-- webhook_events is GLOBAL (SRS Data Model §6) — no RLS.

ALTER TABLE "finance"."payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."payments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."payments"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "finance"."receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."receipts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."receipts";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."receipts"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
