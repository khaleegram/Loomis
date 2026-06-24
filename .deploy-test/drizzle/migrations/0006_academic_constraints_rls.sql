-- Custom SQL migration: Academic Session CHECK constraints, conditional date
-- invariants, partial uniqueness (CON-017/018), and RLS. drizzle-kit 0.24 does
-- not emit check() constraints, conditional checks, partial indexes, or RLS
-- (loomis-database, loomis-security, loomis-financial-integrity).

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "academic"."academic_years"
   ADD CONSTRAINT "academic_years_status_valid"
   CHECK ("status" IN ('draft', 'active', 'closed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."academic_years"
   ADD CONSTRAINT "academic_years_dates_valid" CHECK ("end_date" > "start_date");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."academic_years"
   ADD CONSTRAINT "academic_years_term_count_valid" CHECK ("term_count" BETWEEN 1 AND 6);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."academic_terms"
   ADD CONSTRAINT "academic_terms_status_valid"
   CHECK ("status" IN ('draft', 'open', 'census_locked', 'closed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."academic_terms"
   ADD CONSTRAINT "academic_terms_sequence_valid" CHECK ("sequence" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- FR-ASM-004: census lock date must fall within the term start/end dates, and the
-- enrollment window must close on or before census lock. Enforced only once the
-- term has been configured (date columns are nullable for draft placeholders).
DO $$ BEGIN
 ALTER TABLE "academic"."academic_terms"
   ADD CONSTRAINT "academic_terms_census_within_term" CHECK (
     "census_lock_date" IS NULL OR "start_date" IS NULL OR "end_date" IS NULL
     OR ("census_lock_date" >= "start_date" AND "census_lock_date" <= "end_date")
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."academic_terms"
   ADD CONSTRAINT "academic_terms_enrollment_before_census" CHECK (
     "enrollment_window_close_date" IS NULL OR "census_lock_date" IS NULL
     OR "enrollment_window_close_date" <= "census_lock_date"
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- FR-ASM-009: a terminal level has no destination; a non-terminal level must have one.
DO $$ BEGIN
 ALTER TABLE "academic"."class_progression_map"
   ADD CONSTRAINT "class_progression_map_terminal_consistent" CHECK (
     ("is_terminal" = true AND "to_class_level_id" IS NULL)
     OR ("is_terminal" = false AND "to_class_level_id" IS NOT NULL)
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records"
   ADD CONSTRAINT "student_promotion_records_outcome_valid"
   CHECK ("outcome" IN ('promoted', 'held_back', 'graduated'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records"
   ADD CONSTRAINT "student_promotion_records_status_valid"
   CHECK ("status" IN ('proposed', 'confirmed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- FR-ASM-007: a held-back student must carry a documented reason.
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records"
   ADD CONSTRAINT "student_promotion_records_held_back_reason"
   CHECK ("outcome" <> 'held_back' OR "held_back_reason" IS NOT NULL);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Partial unique indexes for the single-active invariants ──────────────────

-- CON-017: only one academic year per tenant may be `active` at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "academic_years_one_active_per_tenant"
  ON "academic"."academic_years" ("tenant_id")
  WHERE "status" = 'active';--> statement-breakpoint

-- CON-018: only one term per academic year may be `open` at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "academic_terms_one_open_per_year"
  ON "academic"."academic_terms" ("tenant_id", "academic_year_id")
  WHERE "status" = 'open';--> statement-breakpoint

-- ── Row-Level Security (CON-001 tenant isolation) ─────────────────────────────
-- The application sets `app.current_tenant_id` per connection via
-- withTenantContext(). RESTRICTIVE ANDs with everything; FORCE applies it even to
-- the table owner.

ALTER TABLE "academic"."academic_years" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."academic_years" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."academic_years";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."academic_years"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."academic_terms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."academic_terms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."academic_terms";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."academic_terms"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."class_levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."class_levels" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."class_levels";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."class_levels"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."class_arms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."class_arms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."class_arms";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."class_arms"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."class_progression_map" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."class_progression_map" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."class_progression_map";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."class_progression_map"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."student_promotion_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."student_promotion_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."student_promotion_records";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."student_promotion_records"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

-- ledger.outbox_events is intentionally NOT under tenant-isolation RLS: it is the
-- cross-module integration backbone and the relay must read rows across all
-- tenants to dispatch them. It is internal infrastructure, never exposed via an
-- API route. Producers write to it inside their own tenant-scoped transaction;
-- the `tenant_id` column lets the consumer re-establish tenant context.
