-- Custom SQL migration: CHECK constraints, RLS, and immutability for the tenant
-- module. drizzle-kit 0.24 does not emit check() constraints, RLS policies, or
-- triggers, so they are applied here (loomis-database, loomis-security,
-- loomis-financial-integrity).

-- ── CHECK constraints ────────────────────────────────────────────────────────

-- CON-011: a tier's default PSF rate can never be zero or negative.
DO $$ BEGIN
 ALTER TABLE "tenant"."tiers"
   ADD CONSTRAINT "tiers_default_psf_rate_positive" CHECK ("default_psf_rate_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- CON-011: a PSF rate snapshot of zero (or negative) is permanently blocked at
-- the database layer, in addition to the Zod schema and the service guard.
DO $$ BEGIN
 ALTER TABLE "tenant"."psf_rate_snapshots"
   ADD CONSTRAINT "psf_rate_snapshots_rate_positive" CHECK ("rate_minor" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- A global snapshot has no tenant; a tenant override snapshot must have one.
DO $$ BEGIN
 ALTER TABLE "tenant"."psf_rate_snapshots"
   ADD CONSTRAINT "psf_rate_snapshots_scope_tenant_consistent" CHECK (
     ("scope" = 'global' AND "tenant_id" IS NULL)
     OR ("scope" = 'tenant' AND "tenant_id" IS NOT NULL)
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Immutability of psf_rate_snapshots (append-only) ──────────────────────────
-- System Design §3.2 / loomis-financial-integrity: snapshots are INSERT-only.
-- The trigger blocks any UPDATE or DELETE at the database layer.
CREATE OR REPLACE FUNCTION "tenant"."block_psf_rate_snapshot_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'tenant.psf_rate_snapshots is append-only; % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

DROP TRIGGER IF EXISTS "psf_rate_snapshots_immutable" ON "tenant"."psf_rate_snapshots";--> statement-breakpoint

CREATE TRIGGER "psf_rate_snapshots_immutable"
BEFORE UPDATE OR DELETE ON "tenant"."psf_rate_snapshots"
FOR EACH ROW EXECUTE FUNCTION "tenant"."block_psf_rate_snapshot_mutation"();--> statement-breakpoint

-- ── Row-Level Security (CON-001 tenant isolation) ─────────────────────────────
-- Tenant-bound tables enforce isolation on tenant_id. The application sets
-- `app.current_tenant_id` per connection via withTenantContext(). RESTRICTIVE
-- means the policy ANDs with everything and cannot be bypassed. FORCE applies it
-- even to the table owner. Note: the `tenants` and `tiers` tables are
-- platform-managed registry/reference data and are intentionally not isolated.

ALTER TABLE "tenant"."configurations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant"."configurations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "tenant"."configurations";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "tenant"."configurations"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

-- psf_rate_snapshots carries a nullable tenant_id: global rows (tenant_id IS NULL)
-- are visible/writable in any context (the platform default is public to every
-- school); per-tenant override rows are isolated to their tenant's context.
ALTER TABLE "tenant"."psf_rate_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant"."psf_rate_snapshots" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "tenant"."psf_rate_snapshots";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "tenant"."psf_rate_snapshots"
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
