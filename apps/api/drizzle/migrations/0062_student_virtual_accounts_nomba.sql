CREATE TABLE IF NOT EXISTS "finance"."student_virtual_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"provider" varchar(20) DEFAULT 'nomba' NOT NULL,
	"account_ref" varchar(120) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"bank_name" varchar(120) NOT NULL,
	"account_name" varchar(200) NOT NULL,
	"nomba_account_holder_id" varchar(80),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_virtual_accounts_provider_valid" CHECK ("provider" IN ('nomba')),
	CONSTRAINT "student_virtual_accounts_status_valid" CHECK ("status" IN ('active', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "finance"."student_virtual_accounts" ADD CONSTRAINT "student_virtual_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "student_virtual_accounts_tenant_student_unique" ON "finance"."student_virtual_accounts" USING btree ("tenant_id","student_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "student_virtual_accounts_account_ref_unique" ON "finance"."student_virtual_accounts" USING btree ("account_ref");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_virtual_accounts_account_number_idx" ON "finance"."student_virtual_accounts" USING btree ("account_number");
--> statement-breakpoint
ALTER TABLE "finance"."student_virtual_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "finance"."student_virtual_accounts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."student_virtual_accounts";
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."student_virtual_accounts"
  AS RESTRICTIVE FOR ALL TO public
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."webhook_events" DROP CONSTRAINT "webhook_events_provider_valid";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "finance"."webhook_events"
  ADD CONSTRAINT "webhook_events_provider_valid"
  CHECK ("provider" IN ('paystack', 'nomba'));
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."reconciliation_exceptions" DROP CONSTRAINT "reconciliation_exceptions_provider_valid";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "finance"."reconciliation_exceptions"
  ADD CONSTRAINT "reconciliation_exceptions_provider_valid"
  CHECK ("provider" IN ('paystack', 'nomba'));
