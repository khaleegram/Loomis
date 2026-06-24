CREATE TABLE IF NOT EXISTS "finance"."refund_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"reason_code" varchar(30) NOT NULL,
	"reason_notes" varchar(1000),
	"psf_treatment" varchar(30) DEFAULT 'not_reversed' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"workflow_instance_id" uuid NOT NULL,
	"psf_reversal_workflow_id" uuid,
	"requested_by_id" uuid NOT NULL,
	"approved_by_id" uuid,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."reconciliation_exceptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"provider" varchar(20) NOT NULL,
	"exception_type" varchar(30) NOT NULL,
	"gateway_reference" varchar(120),
	"payment_id" uuid,
	"gateway_amount_minor" bigint,
	"platform_amount_minor" bigint,
	"settlement_date" date NOT NULL,
	"reconciliation_run_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"resolution_notes" varchar(1000),
	"resolved_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."refund_requests" ADD CONSTRAINT "refund_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."refund_requests" ADD CONSTRAINT "refund_requests_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "finance"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."refund_requests" ADD CONSTRAINT "refund_requests_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "finance"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."reconciliation_exceptions" ADD CONSTRAINT "reconciliation_exceptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."reconciliation_exceptions" ADD CONSTRAINT "reconciliation_exceptions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "finance"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refund_requests_tenant_status_idx" ON "finance"."refund_requests" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refund_requests_payment_idx" ON "finance"."refund_requests" USING btree ("tenant_id","payment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "refund_requests_workflow_unique" ON "finance"."refund_requests" USING btree ("workflow_instance_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reconciliation_exceptions_tenant_status_idx" ON "finance"."reconciliation_exceptions" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reconciliation_exceptions_run_idx" ON "finance"."reconciliation_exceptions" USING btree ("reconciliation_run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reconciliation_exceptions_provider_ref_idx" ON "finance"."reconciliation_exceptions" USING btree ("provider","gateway_reference");
