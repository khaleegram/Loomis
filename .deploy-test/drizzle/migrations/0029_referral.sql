CREATE SCHEMA IF NOT EXISTS "referral";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral"."participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"participant_type" varchar(25) NOT NULL,
	"manager_participant_id" uuid,
	"region" varchar(50),
	"status" varchar(20) DEFAULT 'pending_kyc' NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deactivation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral"."kyc_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"status" varchar(15) DEFAULT 'pending' NOT NULL,
	"identity_document_object_id" uuid,
	"address_proof_object_id" uuid,
	"conflict_of_interest_declared" boolean DEFAULT false NOT NULL,
	"conflict_details" text,
	"conflict_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral"."referral_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"status" varchar(15) DEFAULT 'pending' NOT NULL,
	"activated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"shown_once_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral"."payout_cycles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" varchar(15) DEFAULT 'open' NOT NULL,
	"rules_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_payout_minor" bigint DEFAULT 0 NOT NULL,
	"tenant_cap_usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"closed_at" timestamp with time zone,
	"disbursed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral"."attributions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"direct_participant_id" uuid NOT NULL,
	"manager_participant_id" uuid,
	"onboarding_source" varchar(25) NOT NULL,
	"status" varchar(15) DEFAULT 'active' NOT NULL,
	"flag_reason" varchar(50),
	"attributed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral"."earning_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"attribution_id" uuid NOT NULL,
	"psf_obligation_id" uuid NOT NULL,
	"payout_cycle_id" uuid,
	"earning_type" varchar(20) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"psf_settled_amount_minor" bigint NOT NULL,
	"rate_basis_points" integer NOT NULL,
	"status" varchar(20) DEFAULT 'accrued' NOT NULL,
	"hold_reason" varchar(40),
	"idempotency_key" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral"."processed_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."kyc_records" ADD CONSTRAINT "kyc_records_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "referral"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."referral_codes" ADD CONSTRAINT "referral_codes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "referral"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."attributions" ADD CONSTRAINT "attributions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."attributions" ADD CONSTRAINT "attributions_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "referral"."referral_codes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."attributions" ADD CONSTRAINT "attributions_direct_participant_id_participants_id_fk" FOREIGN KEY ("direct_participant_id") REFERENCES "referral"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."attributions" ADD CONSTRAINT "attributions_manager_participant_id_participants_id_fk" FOREIGN KEY ("manager_participant_id") REFERENCES "referral"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries" ADD CONSTRAINT "earning_entries_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "referral"."participants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries" ADD CONSTRAINT "earning_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries" ADD CONSTRAINT "earning_entries_attribution_id_attributions_id_fk" FOREIGN KEY ("attribution_id") REFERENCES "referral"."attributions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries" ADD CONSTRAINT "earning_entries_psf_obligation_id_psf_obligations_id_fk" FOREIGN KEY ("psf_obligation_id") REFERENCES "ledger"."psf_obligations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral"."earning_entries" ADD CONSTRAINT "earning_entries_payout_cycle_id_payout_cycles_id_fk" FOREIGN KEY ("payout_cycle_id") REFERENCES "referral"."payout_cycles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "participants_user_id_unique" ON "referral"."participants" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participants_manager_participant_id_idx" ON "referral"."participants" USING btree ("manager_participant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participants_type_status_idx" ON "referral"."participants" USING btree ("participant_type","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kyc_records_participant_status_idx" ON "referral"."kyc_records" USING btree ("participant_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referral_codes_code_hash_unique" ON "referral"."referral_codes" USING btree ("code_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_codes_participant_status_idx" ON "referral"."referral_codes" USING btree ("participant_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attributions_tenant_id_unique" ON "referral"."attributions" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attributions_direct_participant_idx" ON "referral"."attributions" USING btree ("direct_participant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attributions_manager_participant_idx" ON "referral"."attributions" USING btree ("manager_participant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attributions_status_idx" ON "referral"."attributions" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "earning_entries_participant_cycle_status_idx" ON "referral"."earning_entries" USING btree ("participant_id","payout_cycle_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "earning_entries_tenant_cycle_idx" ON "referral"."earning_entries" USING btree ("tenant_id","payout_cycle_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "earning_entries_idempotency_key_unique" ON "referral"."earning_entries" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_cycles_period_idx" ON "referral"."payout_cycles" USING btree ("period_start","period_end");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_cycles_status_idx" ON "referral"."payout_cycles" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_processed_events_event_type_idx" ON "referral"."processed_events" USING btree ("event_type");
