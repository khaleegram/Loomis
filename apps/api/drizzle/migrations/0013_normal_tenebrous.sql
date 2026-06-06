CREATE TABLE IF NOT EXISTS "academic"."exam_configs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"grading_scheme_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"configured_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."grade_correction_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"gradebook_entry_id" uuid NOT NULL,
	"workflow_instance_id" uuid NOT NULL,
	"previous_continuous_assessment_score" integer NOT NULL,
	"previous_exam_score" integer NOT NULL,
	"previous_total_score" integer NOT NULL,
	"previous_grade" varchar(10) NOT NULL,
	"new_continuous_assessment_score" integer NOT NULL,
	"new_exam_score" integer NOT NULL,
	"new_total_score" integer NOT NULL,
	"new_grade" varchar(10) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"approved_by_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."gradebook_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"exam_config_id" uuid NOT NULL,
	"grading_scheme_id" uuid NOT NULL,
	"teacher_staff_profile_id" uuid NOT NULL,
	"continuous_assessment_score" integer NOT NULL,
	"exam_score" integer NOT NULL,
	"total_score" integer NOT NULL,
	"grade" varchar(10) NOT NULL,
	"remark" varchar(120),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"corrected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."grading_schemes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"continuous_assessment_weight" integer NOT NULL,
	"exam_weight" integer NOT NULL,
	"pass_mark" integer DEFAULT 40 NOT NULL,
	"grade_bands" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"average_score" integer NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"published_by_id" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."exam_configs" ADD CONSTRAINT "exam_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."exam_configs" ADD CONSTRAINT "exam_configs_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."exam_configs" ADD CONSTRAINT "exam_configs_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."exam_configs" ADD CONSTRAINT "exam_configs_grading_scheme_id_grading_schemes_id_fk" FOREIGN KEY ("grading_scheme_id") REFERENCES "academic"."grading_schemes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."grade_correction_logs" ADD CONSTRAINT "grade_correction_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."grade_correction_logs" ADD CONSTRAINT "grade_correction_logs_gradebook_entry_id_gradebook_entries_id_fk" FOREIGN KEY ("gradebook_entry_id") REFERENCES "academic"."gradebook_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."gradebook_entries" ADD CONSTRAINT "gradebook_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."gradebook_entries" ADD CONSTRAINT "gradebook_entries_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."gradebook_entries" ADD CONSTRAINT "gradebook_entries_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."gradebook_entries" ADD CONSTRAINT "gradebook_entries_exam_config_id_exam_configs_id_fk" FOREIGN KEY ("exam_config_id") REFERENCES "academic"."exam_configs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."gradebook_entries" ADD CONSTRAINT "gradebook_entries_grading_scheme_id_grading_schemes_id_fk" FOREIGN KEY ("grading_scheme_id") REFERENCES "academic"."grading_schemes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."grading_schemes" ADD CONSTRAINT "grading_schemes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."results" ADD CONSTRAINT "results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."results" ADD CONSTRAINT "results_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."results" ADD CONSTRAINT "results_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "exam_configs_term_class_subject_unique" ON "academic"."exam_configs" USING btree ("tenant_id","term_id","class_arm_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exam_configs_tenant_term_idx" ON "academic"."exam_configs" USING btree ("tenant_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grade_correction_logs_workflow_instance_unique" ON "academic"."grade_correction_logs" USING btree ("workflow_instance_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grade_correction_logs_entry_status_idx" ON "academic"."grade_correction_logs" USING btree ("tenant_id","gradebook_entry_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gradebook_entries_student_subject_unique" ON "academic"."gradebook_entries" USING btree ("tenant_id","term_id","class_arm_id","subject_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gradebook_entries_term_class_subject_idx" ON "academic"."gradebook_entries" USING btree ("tenant_id","term_id","class_arm_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grading_schemes_tenant_id_name_unique" ON "academic"."grading_schemes" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grading_schemes_tenant_default_unique" ON "academic"."grading_schemes" USING btree ("tenant_id") WHERE "grading_schemes"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "results_student_term_unique" ON "academic"."results" USING btree ("tenant_id","term_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "results_term_class_idx" ON "academic"."results" USING btree ("tenant_id","term_id","class_arm_id");