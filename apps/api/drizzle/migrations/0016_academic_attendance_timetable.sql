-- Academic Management — attendance, timetable, assignments & submissions
-- (SRS §4.5 FR-ACA-001/002/003; CON-003; US-ACA-005..007). Hand-written because
-- drizzle-kit 0.24 does not emit check() constraints, partial unique indexes, or
-- RLS (loomis-database, loomis-security). Tables live in the existing `academic`
-- schema (created in 0005).

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "academic"."attendance_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"session" varchar(20) DEFAULT 'full_day' NOT NULL,
	"status" varchar(20) NOT NULL,
	"source" varchar(20) DEFAULT 'online' NOT NULL,
	"device_id" uuid,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"marked_by_staff_profile_id" uuid NOT NULL,
	"marked_by_user_id" uuid NOT NULL,
	"captured_at" timestamp with time zone,
	"synced_at" timestamp with time zone,
	"amended_at" timestamp with time zone,
	"amended_by_user_id" uuid,
	"previous_status" varchar(20),
	"amendment_reason" varchar(500),
	"amendment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."attendance_device_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"public_key_pem" varchar(2000) NOT NULL,
	"label" varchar(120),
	"registered_by_user_id" uuid NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."timetables" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_staff_profile_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"venue" varchar(120),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_staff_profile_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"instructions" varchar(5000) NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"content" varchar(10000),
	"storage_object_id" uuid,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer,
	"feedback" varchar(2000),
	"graded_by_staff_profile_id" uuid,
	"graded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── Foreign keys ─────────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_device_keys" ADD CONSTRAINT "attendance_device_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "academic"."assignments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."submissions" ADD CONSTRAINT "submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Indexes & uniqueness ─────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_records_student_session_unique" ON "academic"."attendance_records" USING btree ("tenant_id","term_id","class_arm_id","student_id","attendance_date","session");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_class_date_idx" ON "academic"."attendance_records" USING btree ("tenant_id","term_id","class_arm_id","attendance_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_student_idx" ON "academic"."attendance_records" USING btree ("tenant_id","term_id","student_id");--> statement-breakpoint
-- MOB-007: one ACTIVE signing key per device; a revoked key can be replaced.
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_device_keys_tenant_device_active_unique" ON "academic"."attendance_device_keys" USING btree ("tenant_id","device_id") WHERE "revoked" = false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_device_keys_tenant_device_idx" ON "academic"."attendance_device_keys" USING btree ("tenant_id","device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timetables_class_day_idx" ON "academic"."timetables" USING btree ("tenant_id","term_id","class_arm_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timetables_teacher_day_idx" ON "academic"."timetables" USING btree ("tenant_id","term_id","teacher_staff_profile_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_class_subject_idx" ON "academic"."assignments" USING btree ("tenant_id","term_id","class_arm_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_class_status_idx" ON "academic"."assignments" USING btree ("tenant_id","class_arm_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_assignment_student_unique" ON "academic"."submissions" USING btree ("tenant_id","assignment_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_assignment_status_idx" ON "academic"."submissions" USING btree ("tenant_id","assignment_id","status");--> statement-breakpoint

-- ── CHECK constraints ────────────────────────────────────────────────────────

DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_status_valid" CHECK ("status" IN ('present', 'absent', 'late', 'excused'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_session_valid" CHECK ("session" IN ('morning', 'afternoon', 'full_day'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_source_valid" CHECK ("source" IN ('online', 'offline_sync'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_day_valid" CHECK ("day_of_week" BETWEEN 1 AND 7);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_time_valid" CHECK ("start_minute" >= 0 AND "start_minute" < 1440 AND "end_minute" > "start_minute" AND "end_minute" <= 1440);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_status_valid" CHECK ("status" IN ('draft', 'published'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_status_valid" CHECK ("status" IN ('draft', 'published', 'closed'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_max_score_valid" CHECK ("max_score" > 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."submissions" ADD CONSTRAINT "submissions_status_valid" CHECK ("status" IN ('submitted', 'late', 'graded', 'returned'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."submissions" ADD CONSTRAINT "submissions_score_valid" CHECK ("score" IS NULL OR "score" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- ── Row-Level Security (CON-001 tenant isolation) ─────────────────────────────
-- RESTRICTIVE ANDs with everything; FORCE applies it even to the table owner.
-- The application sets `app.current_tenant_id` per connection via withTenantContext().

ALTER TABLE "academic"."attendance_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."attendance_records" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."attendance_records";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."attendance_records"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."attendance_device_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."attendance_device_keys" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."attendance_device_keys";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."attendance_device_keys"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."timetables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."timetables" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."timetables";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."timetables"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."assignments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."assignments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."assignments"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint

ALTER TABLE "academic"."submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic"."submissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."submissions";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."submissions"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
