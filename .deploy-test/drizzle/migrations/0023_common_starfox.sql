CREATE TABLE IF NOT EXISTS "ledger"."ledger_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ledger_txn_id" uuid NOT NULL,
	"tenant_id" uuid,
	"account_code" varchar(64) NOT NULL,
	"direction" varchar(6) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'NGN' NOT NULL,
	"source_type" varchar(25) NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger"."processed_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger"."psf_obligations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"rate_snapshot_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) DEFAULT 'NGN' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"liability_reason" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger"."psf_settlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"psf_obligation_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"settlement_amount_minor" bigint NOT NULL,
	"settlement_source" varchar(25) NOT NULL,
	"settlement_status" varchar(20) DEFAULT 'VERIFIED' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"idempotency_key" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger"."ledger_entries" ADD CONSTRAINT "ledger_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger"."psf_obligations" ADD CONSTRAINT "psf_obligations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger"."psf_obligations" ADD CONSTRAINT "psf_obligations_rate_snapshot_id_psf_rate_snapshots_id_fk" FOREIGN KEY ("rate_snapshot_id") REFERENCES "tenant"."psf_rate_snapshots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger"."psf_settlements" ADD CONSTRAINT "psf_settlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger"."psf_settlements" ADD CONSTRAINT "psf_settlements_psf_obligation_id_psf_obligations_id_fk" FOREIGN KEY ("psf_obligation_id") REFERENCES "ledger"."psf_obligations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_ledger_txn_idx" ON "ledger"."ledger_entries" USING btree ("ledger_txn_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_tenant_created_idx" ON "ledger"."ledger_entries" USING btree ("tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_source_idx" ON "ledger"."ledger_entries" USING btree ("source_type","source_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_account_created_idx" ON "ledger"."ledger_entries" USING btree ("account_code","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processed_events_event_type_idx" ON "ledger"."processed_events" USING btree ("event_type");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "psf_obligations_tenant_term_student_unique" ON "ledger"."psf_obligations" USING btree ("tenant_id","term_id","student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "psf_obligations_tenant_term_status_idx" ON "ledger"."psf_obligations" USING btree ("tenant_id","term_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "psf_obligations_term_status_idx" ON "ledger"."psf_obligations" USING btree ("term_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "psf_settlements_obligation_idx" ON "ledger"."psf_settlements" USING btree ("psf_obligation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "psf_settlements_status_created_idx" ON "ledger"."psf_settlements" USING btree ("settlement_status","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "psf_settlements_idempotency_unique" ON "ledger"."psf_settlements" USING btree ("idempotency_key");
