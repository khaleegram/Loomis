CREATE SCHEMA "hrm";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hrm"."classteacher_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_profile_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"assigned_by_id" uuid NOT NULL,
	"replaced_assignment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hrm"."role_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_profile_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"assignment_type" varchar(20) NOT NULL,
	"primary_staff_profile_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"approved_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hrm"."staff_invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_profile_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"invited_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hrm"."staff_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notification_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"joined_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"deactivated_by_id" uuid,
	"deactivation_reason" varchar(500),
	"reactivated_at" timestamp with time zone,
	"reactivated_by_id" uuid,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hrm"."subject_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"staff_profile_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_arm_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"assigned_by_id" uuid NOT NULL,
	"approved_by_id" uuid NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by_id" uuid,
	"removal_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."classteacher_assignments" ADD CONSTRAINT "classteacher_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."classteacher_assignments" ADD CONSTRAINT "classteacher_assignments_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "hrm"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."role_assignments" ADD CONSTRAINT "role_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."role_assignments" ADD CONSTRAINT "role_assignments_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "hrm"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."role_assignments" ADD CONSTRAINT "role_assignments_primary_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("primary_staff_profile_id") REFERENCES "hrm"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."staff_invitations" ADD CONSTRAINT "staff_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."staff_invitations" ADD CONSTRAINT "staff_invitations_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "hrm"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."staff_invitations" ADD CONSTRAINT "staff_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."staff_profiles" ADD CONSTRAINT "staff_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."subject_assignments" ADD CONSTRAINT "subject_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hrm"."subject_assignments" ADD CONSTRAINT "subject_assignments_staff_profile_id_staff_profiles_id_fk" FOREIGN KEY ("staff_profile_id") REFERENCES "hrm"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classteacher_assignments_term_id_class_arm_id_idx" ON "hrm"."classteacher_assignments" USING btree ("term_id","class_arm_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "classteacher_assignments_staff_profile_id_term_id_idx" ON "hrm"."classteacher_assignments" USING btree ("staff_profile_id","term_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_assignments_staff_profile_id_active_idx" ON "hrm"."role_assignments" USING btree ("staff_profile_id","active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_assignments_tenant_id_role_active_idx" ON "hrm"."role_assignments" USING btree ("tenant_id","role","active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_invitations_token_hash_unique" ON "hrm"."staff_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_invitations_staff_profile_id_idx" ON "hrm"."staff_invitations" USING btree ("staff_profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_invitations_tenant_id_email_idx" ON "hrm"."staff_invitations" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_profiles_tenant_id_user_id_unique" ON "hrm"."staff_profiles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_profiles_tenant_id_email_unique" ON "hrm"."staff_profiles" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_profiles_tenant_id_status_idx" ON "hrm"."staff_profiles" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subject_assignments_staff_profile_id_term_id_idx" ON "hrm"."subject_assignments" USING btree ("staff_profile_id","term_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subject_assignments_term_class_subject_idx" ON "hrm"."subject_assignments" USING btree ("term_id","class_arm_id","subject_id");