-- Custom SQL migration: Academic gradebook CHECK constraints and RLS. drizzle-kit
-- 0.24 does not emit check() constraints or RLS policies.

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "academic"."grading_schemes"
   ADD CONSTRAINT "grading_schemes_weights_sum_100"
   CHECK ("continuous_assessment_weight" + "exam_weight" = 100);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."grading_schemes"
   ADD CONSTRAINT "grading_schemes_weights_range"
   CHECK ("continuous_assessment_weight" BETWEEN 0 AND 100 AND "exam_weight" BETWEEN 0 AND 100);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."grading_schemes"
   ADD CONSTRAINT "grading_schemes_pass_mark_range" CHECK ("pass_mark" BETWEEN 0 AND 100);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."exam_configs"
   ADD CONSTRAINT "exam_configs_status_valid" CHECK ("status" IN ('draft', 'open', 'closed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."gradebook_entries"
   ADD CONSTRAINT "gradebook_entries_score_range"
   CHECK (
     "continuous_assessment_score" BETWEEN 0 AND 100
     AND "exam_score" BETWEEN 0 AND 100
     AND "total_score" BETWEEN 0 AND 100
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."gradebook_entries"
   ADD CONSTRAINT "gradebook_entries_status_valid"
   CHECK ("status" IN ('draft', 'submitted', 'correction_pending', 'corrected'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."grade_correction_logs"
   ADD CONSTRAINT "grade_correction_logs_status_valid"
   CHECK ("status" IN ('pending', 'approved', 'rejected', 'returned'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."grade_correction_logs"
   ADD CONSTRAINT "grade_correction_logs_score_range"
   CHECK (
     "previous_continuous_assessment_score" BETWEEN 0 AND 100
     AND "previous_exam_score" BETWEEN 0 AND 100
     AND "previous_total_score" BETWEEN 0 AND 100
     AND "new_continuous_assessment_score" BETWEEN 0 AND 100
     AND "new_exam_score" BETWEEN 0 AND 100
     AND "new_total_score" BETWEEN 0 AND 100
   );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."results"
   ADD CONSTRAINT "results_average_score_range" CHECK ("average_score" BETWEEN 0 AND 100);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "academic"."results"
   ADD CONSTRAINT "results_status_valid" CHECK ("status" IN ('published', 'withdrawn'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE "academic"."grading_schemes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."grading_schemes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."grading_schemes";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."grading_schemes"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."exam_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."exam_configs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."exam_configs";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."exam_configs"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."gradebook_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."gradebook_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."gradebook_entries";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."gradebook_entries"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."grade_correction_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."grade_correction_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."grade_correction_logs";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."grade_correction_logs"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."results" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."results";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."results"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
