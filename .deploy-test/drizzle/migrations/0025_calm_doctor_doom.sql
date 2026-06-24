CREATE TABLE IF NOT EXISTS "student"."enrollment_attestations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"declared_billable_count" integer NOT NULL,
	"system_billable_count" integer NOT NULL,
	"attested_by_id" uuid NOT NULL,
	"attested_at" timestamp with time zone NOT NULL,
	"student_list_hash" varchar(64) NOT NULL,
	"attestation_hash" varchar(64) NOT NULL,
	"rate_snapshot_id" uuid NOT NULL,
	"psf_rate_minor" bigint NOT NULL,
	"attestation_status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."enrollment_attestations" ADD CONSTRAINT "enrollment_attestations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student"."enrollment_attestations" ADD CONSTRAINT "enrollment_attestations_rate_snapshot_id_psf_rate_snapshots_id_fk" FOREIGN KEY ("rate_snapshot_id") REFERENCES "tenant"."psf_rate_snapshots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enrollment_attestations_tenant_term_unique" ON "student"."enrollment_attestations" USING btree ("tenant_id","term_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollment_attestations_status_idx" ON "student"."enrollment_attestations" USING btree ("attestation_status");