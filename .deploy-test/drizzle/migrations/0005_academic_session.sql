CREATE SCHEMA "academic";
--> statement-breakpoint
CREATE SCHEMA "ledger";
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
DO $$ BEGIN
 ALTER TABLE "academic"."academic_years" ADD CONSTRAINT "academic_years_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
 ALTER TABLE "academic"."class_levels" ADD CONSTRAINT "class_levels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
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
CREATE UNIQUE INDEX IF NOT EXISTS "academic_years_tenant_id_label_unique" ON "academic"."academic_years" USING btree ("tenant_id","label");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academic_years_tenant_id_status_idx" ON "academic"."academic_years" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "academic_terms_year_id_sequence_unique" ON "academic"."academic_terms" USING btree ("academic_year_id","sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "academic_terms_tenant_year_status_idx" ON "academic"."academic_terms" USING btree ("tenant_id","academic_year_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_levels_tenant_id_code_unique" ON "academic"."class_levels" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_levels_tenant_id_rank_unique" ON "academic"."class_levels" USING btree ("tenant_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_arms_year_level_name_unique" ON "academic"."class_arms" USING btree ("tenant_id","academic_year_id","class_level_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_arms_tenant_year_idx" ON "academic"."class_arms" USING btree ("tenant_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_progression_map_tenant_from_unique" ON "academic"."class_progression_map" USING btree ("tenant_id","from_class_level_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "student_promotion_records_from_year_student_unique" ON "academic"."student_promotion_records" USING btree ("tenant_id","from_academic_year_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_promotion_records_to_year_idx" ON "academic"."student_promotion_records" USING btree ("tenant_id","to_academic_year_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_published_at_id_idx" ON "ledger"."outbox_events" USING btree ("published_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_event_type_idx" ON "ledger"."outbox_events" USING btree ("event_type");
