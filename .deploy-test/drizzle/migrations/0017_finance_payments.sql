CREATE TABLE IF NOT EXISTS "finance"."payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"method" varchar(30) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"status" varchar(30) DEFAULT 'pending_verification' NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"logged_by_id" uuid NOT NULL,
	"verified_by_id" uuid,
	"verified_at" timestamp with time zone,
	"payment_date" date NOT NULL,
	"channel_reference" varchar(120),
	"evidence_storage_object_id" uuid,
	"gateway_provider" varchar(20),
	"gateway_reference" varchar(120),
	"gateway_authorization_url" varchar(2000),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"status" varchar(20) DEFAULT 'provisional' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"line_items" jsonb NOT NULL,
	"issued_by_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance"."webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_event_id" varchar(120) NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"signature_valid" boolean NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'received' NOT NULL,
	"provider_timestamp" timestamp with time zone,
	"tenant_id" uuid,
	"payment_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "finance"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."receipts" ADD CONSTRAINT "receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance"."receipts" ADD CONSTRAINT "receipts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "finance"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payments_tenant_idempotency_unique" ON "finance"."payments" USING btree ("tenant_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_tenant_invoice_idx" ON "finance"."payments" USING btree ("tenant_id","invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_tenant_student_idx" ON "finance"."payments" USING btree ("tenant_id","student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_tenant_status_idx" ON "finance"."payments" USING btree ("tenant_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_gateway_reference_idx" ON "finance"."payments" USING btree ("gateway_provider","gateway_reference");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_payment_unique" ON "finance"."receipts" USING btree ("payment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_tenant_term_sequence_unique" ON "finance"."receipts" USING btree ("tenant_id","term_id","sequence_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "receipts_tenant_term_idx" ON "finance"."receipts" USING btree ("tenant_id","term_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_event_unique" ON "finance"."webhook_events" USING btree ("provider","provider_event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_status_idx" ON "finance"."webhook_events" USING btree ("status","created_at");
