-- Custom SQL migration: Ledger CHECK constraints, RLS, immutability triggers,
-- and INSERT-only role pattern (loomis-database, loomis-financial-integrity,
-- System Design §6.2 / §8.3).

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "ledger"."psf_obligations"
   ADD CONSTRAINT "psf_obligations_amount_positive" CHECK ("amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."psf_obligations"
   ADD CONSTRAINT "psf_obligations_status_valid"
   CHECK ("status" IN ('pending', 'settled', 'waived_pending', 'waived', 'disputed', 'written_off'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."psf_obligations"
   ADD CONSTRAINT "psf_obligations_liability_reason_valid"
   CHECK ("liability_reason" IN ('census_locked', 'activity_inferred', 'late_enrollment', 'platform_adjustment'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."psf_settlements"
   ADD CONSTRAINT "psf_settlements_amount_positive" CHECK ("settlement_amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."psf_settlements"
   ADD CONSTRAINT "psf_settlements_source_valid"
   CHECK ("settlement_source" IN ('GATEWAY_SPLIT', 'OFFLINE_CASH', 'BANK_TRANSFER', 'MANUAL_ADJUSTMENT', 'BULK_RECONCILIATION'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."psf_settlements"
   ADD CONSTRAINT "psf_settlements_status_valid"
   CHECK ("settlement_status" IN ('PENDING', 'VERIFIED', 'REJECTED', 'REVERSED'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."ledger_entries"
   ADD CONSTRAINT "ledger_entries_direction_valid" CHECK ("direction" IN ('debit', 'credit'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."ledger_entries"
   ADD CONSTRAINT "ledger_entries_amount_positive" CHECK ("amount_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ledger"."ledger_entries"
   ADD CONSTRAINT "ledger_entries_source_type_valid"
   CHECK ("source_type" IN ('psf_obligation', 'payment', 'refund', 'referral_payout', 'admin_adjustment', 'chargeback'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Immutability triggers (INSERT-only tables) ─────────────────────────────────

CREATE OR REPLACE FUNCTION "ledger"."block_psf_obligation_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger.psf_obligations is append-only; % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS "psf_obligations_immutable" ON "ledger"."psf_obligations";--> statement-breakpoint

CREATE TRIGGER "psf_obligations_immutable"
BEFORE UPDATE OR DELETE ON "ledger"."psf_obligations"
FOR EACH ROW EXECUTE FUNCTION "ledger"."block_psf_obligation_mutation"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "ledger"."block_ledger_entry_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger.ledger_entries is append-only; % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS "ledger_entries_immutable" ON "ledger"."ledger_entries";--> statement-breakpoint

CREATE TRIGGER "ledger_entries_immutable"
BEFORE UPDATE OR DELETE ON "ledger"."ledger_entries"
FOR EACH ROW EXECUTE FUNCTION "ledger"."block_ledger_entry_mutation"();--> statement-breakpoint

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- processed_events and outbox_events are platform-scoped (no tenant RLS).
-- psf_obligations, psf_settlements, and ledger_entries are tenant-bound.

ALTER TABLE "ledger"."psf_obligations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ledger"."psf_obligations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "ledger"."psf_obligations";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "ledger"."psf_obligations"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "ledger"."psf_settlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ledger"."psf_settlements" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "ledger"."psf_settlements";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "ledger"."psf_settlements"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "ledger"."ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ledger"."ledger_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "ledger"."ledger_entries";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "ledger"."ledger_entries"
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

-- ── INSERT-only database role (System Design §6.2) ───────────────────────────
-- Production ECS tasks use `loomis_ledger` for ledger writes. Local dev uses the
-- main application role; grants are idempotent for both paths.

DO $$ BEGIN
  CREATE ROLE loomis_ledger NOLOGIN;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

GRANT USAGE ON SCHEMA ledger TO loomis_ledger;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON ledger.outbox_events TO loomis_ledger;--> statement-breakpoint
GRANT SELECT, INSERT ON ledger.psf_obligations TO loomis_ledger;--> statement-breakpoint
GRANT SELECT, INSERT ON ledger.psf_settlements TO loomis_ledger;--> statement-breakpoint
GRANT INSERT ON ledger.ledger_entries TO loomis_ledger;--> statement-breakpoint
GRANT SELECT ON ledger.ledger_entries TO loomis_ledger;--> statement-breakpoint
GRANT SELECT, INSERT ON ledger.processed_events TO loomis_ledger;--> statement-breakpoint
GRANT SELECT ON tenant.psf_rate_snapshots TO loomis_ledger;--> statement-breakpoint
GRANT SELECT ON tenant.tenants TO loomis_ledger;
