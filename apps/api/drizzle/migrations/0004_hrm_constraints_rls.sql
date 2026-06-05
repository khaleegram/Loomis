-- Custom SQL migration: HRM CHECK constraints, partial uniqueness, and RLS.
-- drizzle-kit 0.24 does not emit these database invariants.

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "hrm"."staff_profiles"
   ADD CONSTRAINT "staff_profiles_status_valid"
   CHECK ("status" IN ('pending', 'active', 'deactivated'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "hrm"."role_assignments"
   ADD CONSTRAINT "role_assignments_type_valid"
   CHECK ("assignment_type" IN ('primary', 'extension', 'backup', 'deputy'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "hrm"."role_assignments"
   ADD CONSTRAINT "role_assignments_class_teacher_extension_only"
   CHECK ("role" <> 'class_teacher' OR "assignment_type" = 'extension');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "hrm"."staff_invitations"
   ADD CONSTRAINT "staff_invitations_expiry_after_created"
   CHECK ("expires_at" > "created_at");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Partial unique indexes for active HRM invariants ─────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "role_assignments_one_active_primary_per_staff"
  ON "hrm"."role_assignments" ("tenant_id", "staff_profile_id")
  WHERE "active" = true AND "assignment_type" = 'primary';--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "role_assignments_one_active_extension_per_staff_role"
  ON "hrm"."role_assignments" ("tenant_id", "staff_profile_id", "role")
  WHERE "active" = true AND "assignment_type" = 'extension';--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "subject_assignments_one_active_teacher_subject"
  ON "hrm"."subject_assignments" ("tenant_id", "staff_profile_id", "term_id", "class_arm_id", "subject_id")
  WHERE "active" = true;--> statement-breakpoint

-- FR-HRM-004: exactly one active Class Teacher per class arm per term.
CREATE UNIQUE INDEX IF NOT EXISTS "classteacher_assignments_one_active_per_arm_term"
  ON "hrm"."classteacher_assignments" ("tenant_id", "term_id", "class_arm_id")
  WHERE "active" = true;--> statement-breakpoint

-- FR-HRM-004: a Teacher can be Class Teacher for only one arm per term.
CREATE UNIQUE INDEX IF NOT EXISTS "classteacher_assignments_one_active_arm_per_teacher_term"
  ON "hrm"."classteacher_assignments" ("tenant_id", "staff_profile_id", "term_id")
  WHERE "active" = true;--> statement-breakpoint

-- ── Row-Level Security (CON-001 tenant isolation) ─────────────────────────────

ALTER TABLE "hrm"."staff_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm"."staff_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "hrm"."staff_profiles";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "hrm"."staff_profiles"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "hrm"."role_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm"."role_assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "hrm"."role_assignments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "hrm"."role_assignments"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "hrm"."subject_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm"."subject_assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "hrm"."subject_assignments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "hrm"."subject_assignments"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "hrm"."classteacher_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm"."classteacher_assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "hrm"."classteacher_assignments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "hrm"."classteacher_assignments"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "hrm"."staff_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hrm"."staff_invitations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "hrm"."staff_invitations";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "hrm"."staff_invitations"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint
