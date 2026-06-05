CREATE SCHEMA "workflow";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow"."workflow_decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"workflow_instance_id" uuid NOT NULL,
	"workflow_step_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" varchar(50) NOT NULL,
	"decision" varchar(20) NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow"."workflow_instances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"workflow_type" varchar(80) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"requested_by_role" varchar(50) NOT NULL,
	"subject_type" varchar(50),
	"subject_id" uuid,
	"title" varchar(200),
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_step_sequence" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow"."workflow_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"workflow_instance_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"approver_role" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"timeout_hours" integer,
	"escalates_to_role" varchar(50),
	"due_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow"."workflow_templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"workflow_type" varchar(80) NOT NULL,
	"approver_chain" jsonb NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow"."workflow_decisions" ADD CONSTRAINT "workflow_decisions_workflow_instance_id_workflow_instances_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow"."workflow_decisions" ADD CONSTRAINT "workflow_decisions_workflow_step_id_workflow_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "workflow"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow"."workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_instance_id_workflow_instances_id_fk" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow"."workflow_instances"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_decisions_instance_idx" ON "workflow"."workflow_decisions" USING btree ("workflow_instance_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_instances_tenant_status_idx" ON "workflow"."workflow_instances" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_instances_requested_by_idx" ON "workflow"."workflow_instances" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_instances_workflow_type_idx" ON "workflow"."workflow_instances" USING btree ("workflow_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_steps_instance_sequence_unique" ON "workflow"."workflow_steps" USING btree ("workflow_instance_id","sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_steps_active_due_idx" ON "workflow"."workflow_steps" USING btree ("status","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_templates_tenant_type_unique" ON "workflow"."workflow_templates" USING btree ("tenant_id","workflow_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_templates_workflow_type_idx" ON "workflow"."workflow_templates" USING btree ("workflow_type");