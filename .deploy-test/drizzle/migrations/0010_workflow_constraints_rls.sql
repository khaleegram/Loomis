-- Custom SQL migration: Workflow CHECK constraints and RLS (loomis-database,
-- loomis-security). drizzle-kit 0.24 does not emit check() constraints or RLS.

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "workflow"."workflow_instances"
   ADD CONSTRAINT "workflow_instances_status_valid"
   CHECK ("status" IN ('pending', 'approved', 'rejected', 'returned', 'cancelled'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "workflow"."workflow_steps"
   ADD CONSTRAINT "workflow_steps_status_valid"
   CHECK ("status" IN ('pending', 'active', 'approved', 'rejected', 'returned', 'skipped', 'escalated'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "workflow"."workflow_steps"
   ADD CONSTRAINT "workflow_steps_sequence_positive" CHECK ("sequence" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "workflow"."workflow_decisions"
   ADD CONSTRAINT "workflow_decisions_decision_valid"
   CHECK ("decision" IN ('approve', 'reject', 'return'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- Platform-scoped rows (`tenant_id IS NULL`) are visible when
-- `app.current_tenant_id` is empty (null tenant context). Tenant-scoped rows
-- require an exact tenant match.

ALTER TABLE "workflow"."workflow_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workflow"."workflow_templates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "workflow"."workflow_templates";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "workflow"."workflow_templates"
  AS RESTRICTIVE
  FOR ALL
  USING (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  )
  WITH CHECK (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  );--> statement-breakpoint

ALTER TABLE "workflow"."workflow_instances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workflow"."workflow_instances" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "workflow"."workflow_instances";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "workflow"."workflow_instances"
  AS RESTRICTIVE
  FOR ALL
  USING (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  )
  WITH CHECK (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  );--> statement-breakpoint

ALTER TABLE "workflow"."workflow_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workflow"."workflow_steps" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "workflow"."workflow_steps";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "workflow"."workflow_steps"
  AS RESTRICTIVE
  FOR ALL
  USING (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  )
  WITH CHECK (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  );--> statement-breakpoint

ALTER TABLE "workflow"."workflow_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workflow"."workflow_decisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "workflow"."workflow_decisions";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "workflow"."workflow_decisions"
  AS RESTRICTIVE
  FOR ALL
  USING (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  )
  WITH CHECK (
    ("tenant_id" IS NULL AND current_setting('app.current_tenant_id', true) = '')
    OR ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  );
