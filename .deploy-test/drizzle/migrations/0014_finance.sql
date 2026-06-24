CREATE SCHEMA "finance";
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
CREATE TABLE IF NOT EXISTS "finance"."fee_structure_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"fee_structure_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(40) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."fee_structures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_level_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"total_amount_minor" bigint DEFAULT 0 NOT NULL,
	"created_by_id" uuid NOT NULL,
	"last_amended_by_id" uuid,
	"last_amendment_workflow_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."invoice_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(40) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"class_level_id" uuid NOT NULL,
	"fee_structure_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'issued' NOT NULL,
	"amount_charged_minor" bigint NOT NULL,
	"amount_paid_minor" bigint DEFAULT 0 NOT NULL,
	"balance_minor" bigint NOT NULL,
	"due_date" date,
	"issued_by_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."assignments" ADD CONSTRAINT "assignments_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_device_keys" ADD CONSTRAINT "attendance_device_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."attendance_records" ADD CONSTRAINT "attendance_records_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."submissions" ADD CONSTRAINT "submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "academic"."assignments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_class_arm_id_class_arms_id_fk" FOREIGN KEY ("class_arm_id") REFERENCES "academic"."class_arms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."fee_structure_items" ADD CONSTRAINT "fee_structure_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."fee_structure_items" ADD CONSTRAINT "fee_structure_items_fee_structure_id_fee_structures_id_fk" FOREIGN KEY ("fee_structure_id") REFERENCES "finance"."fee_structures"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."fee_structures" ADD CONSTRAINT "fee_structures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."invoice_items" ADD CONSTRAINT "invoice_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "finance"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_class_subject_idx" ON "academic"."assignments" USING btree ("tenant_id","term_id","class_arm_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_class_status_idx" ON "academic"."assignments" USING btree ("tenant_id","class_arm_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_device_keys_tenant_device_unique" ON "academic"."attendance_device_keys" USING btree ("tenant_id","device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_device_keys_tenant_device_active_idx" ON "academic"."attendance_device_keys" USING btree ("tenant_id","device_id","revoked");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_records_student_session_unique" ON "academic"."attendance_records" USING btree ("tenant_id","term_id","class_arm_id","student_id","attendance_date","session");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_class_date_idx" ON "academic"."attendance_records" USING btree ("tenant_id","term_id","class_arm_id","attendance_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_student_idx" ON "academic"."attendance_records" USING btree ("tenant_id","term_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_assignment_student_unique" ON "academic"."submissions" USING btree ("tenant_id","assignment_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_assignment_status_idx" ON "academic"."submissions" USING btree ("tenant_id","assignment_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timetables_class_day_idx" ON "academic"."timetables" USING btree ("tenant_id","term_id","class_arm_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timetables_teacher_day_idx" ON "academic"."timetables" USING btree ("tenant_id","term_id","teacher_staff_profile_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_structure_items_tenant_structure_idx" ON "finance"."fee_structure_items" USING btree ("tenant_id","fee_structure_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fee_structures_tenant_term_class_unique" ON "finance"."fee_structures" USING btree ("tenant_id","term_id","class_level_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_structures_tenant_term_idx" ON "finance"."fee_structures" USING btree ("tenant_id","term_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_items_tenant_invoice_idx" ON "finance"."invoice_items" USING btree ("tenant_id","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_tenant_term_student_unique" ON "finance"."invoices" USING btree ("tenant_id","term_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_tenant_term_class_status_idx" ON "finance"."invoices" USING btree ("tenant_id","term_id","class_level_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_tenant_student_idx" ON "finance"."invoices" USING btree ("tenant_id","student_id");