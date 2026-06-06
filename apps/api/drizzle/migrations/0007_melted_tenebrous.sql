CREATE SCHEMA IF NOT EXISTS "academic";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "ledger";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "student";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."academic_terms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"sequence" integer NOT NULL,
	"start_date" date,
	"end_date" date,
	"enrollment_window_open_date" date,
	"enrollment_window_close_date" date,
	"census_lock_date" date,
	"exam_start_date" date,
	"exam_end_date" date,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"declared_billable_count" integer,
	"system_billable_count" integer,
	"census_variance_reason" varchar(500),
	"opened_at" timestamp with time zone,
	"opened_by_id" uuid,
	"census_locked_at" timestamp with time zone,
	"census_locked_by_id" uuid,
	"closed_at" timestamp with time zone,
	"closed_by_id" uuid,
	"closure_override_reason" varchar(500),
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."academic_years" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"label" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"term_count" integer DEFAULT 3 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"activated_at" timestamp with time zone,
	"activated_by_id" uuid,
	"closed_at" timestamp with time zone,
	"closed_by_id" uuid,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."class_arms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"class_level_id" uuid NOT NULL,
	"name" varchar(30) NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."class_levels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"rank" integer NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."class_progression_map" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_class_level_id" uuid NOT NULL,
	"to_class_level_id" uuid,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "academic"."student_promotion_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"from_academic_year_id" uuid NOT NULL,
	"to_academic_year_id" uuid NOT NULL,
	"from_class_level_id" uuid,
	"from_class_arm_id" uuid,
	"to_class_level_id" uuid,
	"to_class_arm_id" uuid,
	"outcome" varchar(20) NOT NULL,
	"held_back_reason" varchar(500),
	"status" varchar(20) DEFAULT 'proposed' NOT NULL,
	"decided_by_id" uuid NOT NULL,
	"confirmed_by_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger"."outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"aggregate_type" varchar(50) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"tenant_id" uuid,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student"."admissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"reference_number" varchar(32) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" varchar(10) DEFAULT 'unknown' NOT NULL,
	"intended_class_level_id" uuid NOT NULL,
	"guardian_name" varchar(200) NOT NULL,
	"guardian_email" varchar(255) NOT NULL,
	"guardian_phone" varchar(20) NOT NULL,
	"guardian_relationship" varchar(30) NOT NULL,
	"decline_reason" varchar(500),
	"student_id" uuid,
	"decided_by_id" uuid,
	"decided_at" timestamp with time zone,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student"."enrollments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"enrolled_by_id" uuid NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student"."parent_identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email_normalized" varchar(255) NOT NULL,
	"phone_e164" varchar(20),
	"full_name" varchar(200) NOT NULL,
	"user_id" uuid,
	"status" varchar(20) DEFAULT 'unverified' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student"."parent_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"parent_identity_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"relationship" varchar(15) NOT NULL,
	"status" varchar(25) DEFAULT 'initiated' NOT NULL,
	"otp_hash" varchar(64),
	"otp_expires_at" timestamp with time zone,
	"verified_by_factor" varchar(20),
	"initiated_by_id" uuid NOT NULL,
	"school_attested_by_id" uuid,
	"school_attested_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student"."students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"admission_id" uuid NOT NULL,
	"admission_no" varchar(64) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" varchar(10) DEFAULT 'unknown' NOT NULL,
	"status" varchar(20) DEFAULT 'admitted' NOT NULL,
	"identity_attestation_type" varchar(40),
	"identity_attested_at" timestamp with time zone,
	"identity_attested_by_id" uuid,
	"transfer_destination" varchar(200),
	"transfer_reason" varchar(500),
	"transferred_at" timestamp with time zone,
	"transferred_by_id" uuid,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."academic_terms" ADD CONSTRAINT "academic_terms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."academic_terms" ADD CONSTRAINT "academic_terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "academic"."academic_years"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."academic_years" ADD CONSTRAINT "academic_years_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."class_arms" ADD CONSTRAINT "class_arms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."class_arms" ADD CONSTRAINT "class_arms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "academic"."academic_years"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."class_arms" ADD CONSTRAINT "class_arms_class_level_id_class_levels_id_fk" FOREIGN KEY ("class_level_id") REFERENCES "academic"."class_levels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."class_levels" ADD CONSTRAINT "class_levels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."class_progression_map" ADD CONSTRAINT "class_progression_map_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."class_progression_map" ADD CONSTRAINT "class_progression_map_from_class_level_id_class_levels_id_fk" FOREIGN KEY ("from_class_level_id") REFERENCES "academic"."class_levels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."class_progression_map" ADD CONSTRAINT "class_progression_map_to_class_level_id_class_levels_id_fk" FOREIGN KEY ("to_class_level_id") REFERENCES "academic"."class_levels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records" ADD CONSTRAINT "student_promotion_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records" ADD CONSTRAINT "student_promotion_records_from_academic_year_id_academic_years_id_fk" FOREIGN KEY ("from_academic_year_id") REFERENCES "academic"."academic_years"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records" ADD CONSTRAINT "student_promotion_records_to_academic_year_id_academic_years_id_fk" FOREIGN KEY ("to_academic_year_id") REFERENCES "academic"."academic_years"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records" ADD CONSTRAINT "student_promotion_records_from_class_level_id_class_levels_id_fk" FOREIGN KEY ("from_class_level_id") REFERENCES "academic"."class_levels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records" ADD CONSTRAINT "student_promotion_records_from_class_arm_id_class_arms_id_fk" FOREIGN KEY ("from_class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records" ADD CONSTRAINT "student_promotion_records_to_class_level_id_class_levels_id_fk" FOREIGN KEY ("to_class_level_id") REFERENCES "academic"."class_levels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."student_promotion_records" ADD CONSTRAINT "student_promotion_records_to_class_arm_id_class_arms_id_fk" FOREIGN KEY ("to_class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."admissions" ADD CONSTRAINT "admissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."admissions" ADD CONSTRAINT "admissions_intended_class_level_id_class_levels_id_fk" FOREIGN KEY ("intended_class_level_id") REFERENCES "academic"."class_levels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."enrollments" ADD CONSTRAINT "enrollments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "student"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."parent_links" ADD CONSTRAINT "parent_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."parent_links" ADD CONSTRAINT "parent_links_parent_identity_id_parent_identities_id_fk" FOREIGN KEY ("parent_identity_id") REFERENCES "student"."parent_identities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."parent_links" ADD CONSTRAINT "parent_links_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "student"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."students" ADD CONSTRAINT "students_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academic_terms_year_id_sequence_unique" ON "academic"."academic_terms" USING btree ("academic_year_id","sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academic_terms_tenant_year_status_idx" ON "academic"."academic_terms" USING btree ("tenant_id","academic_year_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academic_years_tenant_id_label_unique" ON "academic"."academic_years" USING btree ("tenant_id","label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academic_years_tenant_id_status_idx" ON "academic"."academic_years" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_arms_year_level_name_unique" ON "academic"."class_arms" USING btree ("tenant_id","academic_year_id","class_level_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_arms_tenant_year_idx" ON "academic"."class_arms" USING btree ("tenant_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_levels_tenant_id_code_unique" ON "academic"."class_levels" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_levels_tenant_id_rank_unique" ON "academic"."class_levels" USING btree ("tenant_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_progression_map_tenant_from_unique" ON "academic"."class_progression_map" USING btree ("tenant_id","from_class_level_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "student_promotion_records_from_year_student_unique" ON "academic"."student_promotion_records" USING btree ("tenant_id","from_academic_year_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_promotion_records_to_year_idx" ON "academic"."student_promotion_records" USING btree ("tenant_id","to_academic_year_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_published_at_id_idx" ON "ledger"."outbox_events" USING btree ("published_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_event_type_idx" ON "ledger"."outbox_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admissions_tenant_id_reference_number_unique" ON "student"."admissions" USING btree ("tenant_id","reference_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admissions_tenant_id_status_idx" ON "student"."admissions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_tenant_term_student_unique" ON "student"."enrollments" USING btree ("tenant_id","term_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_tenant_term_status_idx" ON "student"."enrollments" USING btree ("tenant_id","term_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_tenant_term_class_arm_idx" ON "student"."enrollments" USING btree ("tenant_id","term_id","class_arm_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parent_identities_email_normalized_unique" ON "student"."parent_identities" USING btree ("email_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parent_identities_phone_e164_unique" ON "student"."parent_identities" USING btree ("phone_e164") WHERE "parent_identities"."phone_e164" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parent_links_identity_tenant_student_unique" ON "student"."parent_links" USING btree ("parent_identity_id","tenant_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_links_tenant_student_idx" ON "student"."parent_links" USING btree ("tenant_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_links_parent_identity_status_idx" ON "student"."parent_links" USING btree ("parent_identity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "students_tenant_id_admission_no_unique" ON "student"."students" USING btree ("tenant_id","admission_no");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "students_tenant_id_admission_id_unique" ON "student"."students" USING btree ("tenant_id","admission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_tenant_id_status_idx" ON "student"."students" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "students_tenant_name_dob_idx" ON "student"."students" USING btree ("tenant_id","last_name","first_name","date_of_birth");