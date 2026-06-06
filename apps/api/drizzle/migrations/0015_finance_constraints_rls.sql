-- Custom SQL migration: Finance CHECK constraints, RLS, and the outstanding-
-- balance index (loomis-database, loomis-financial-integrity, loomis-security).
-- drizzle-kit 0.24 does not emit check() constraints or RLS policies.

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "finance"."fee_structures"
   ADD CONSTRAINT "fee_structures_status_valid"
   CHECK ("status" IN ('draft', 'active', 'superseded'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."fee_structures"
   ADD CONSTRAINT "fee_structures_total_non_negative" CHECK ("total_amount_minor" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."fee_structures"
   ADD CONSTRAINT "fee_structures_version_positive" CHECK ("version" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."fee_structure_items"
   ADD CONSTRAINT "fee_structure_items_amount_positive" CHECK ("amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."invoices"
   ADD CONSTRAINT "invoices_status_valid"
   CHECK ("status" IN ('draft', 'issued', 'partially_paid', 'paid', 'void'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."invoices"
   ADD CONSTRAINT "invoices_charged_non_negative" CHECK ("amount_charged_minor" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."invoices"
   ADD CONSTRAINT "invoices_paid_non_negative" CHECK ("amount_paid_minor" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- The double-entry-style invariant for a single invoice: balance is always
-- exactly charged minus paid (loomis-financial-integrity).
DO $$ BEGIN
 ALTER TABLE "finance"."invoices"
   ADD CONSTRAINT "invoices_balance_consistent"
   CHECK ("balance_minor" = "amount_charged_minor" - "amount_paid_minor");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."invoice_items"
   ADD CONSTRAINT "invoice_items_amount_positive" CHECK ("amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Outstanding-balance index (US-FIN-005) ───────────────────────────────────
-- A partial, tenant-scoped index so listing students who still owe money for a
-- term is a cheap index scan (only unpaid invoices are indexed).
CREATE INDEX IF NOT EXISTS "invoices_outstanding_idx"
  ON "finance"."invoices" USING btree ("tenant_id", "term_id", "class_level_id")
  WHERE "balance_minor" > 0;--> statement-breakpoint

-- ── Row-Level Security (CON-001 / CON-002 tenant isolation) ───────────────────

ALTER TABLE "finance"."fee_structures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."fee_structures" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."fee_structures";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."fee_structures"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "finance"."fee_structure_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."fee_structure_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."fee_structure_items";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."fee_structure_items"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "finance"."invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."invoices";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."invoices"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "finance"."invoice_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."invoice_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."invoice_items";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."invoice_items"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
