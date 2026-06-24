-- Auto enrollment snapshot billing: rename census columns, simplify attestations, add adjustment requests.

ALTER TABLE "academic"."academic_terms" RENAME COLUMN "census_lock_date" TO "census_snapshot_date";
ALTER TABLE "academic"."academic_terms" RENAME COLUMN "census_locked_at" TO "snapshot_created_at";

ALTER TABLE "academic"."academic_terms" ADD COLUMN "adjustment_window_ends_at" timestamp with time zone;

UPDATE "academic"."academic_terms"
SET "adjustment_window_ends_at" = "snapshot_created_at" + interval '7 days'
WHERE "snapshot_created_at" IS NOT NULL;

ALTER TABLE "academic"."academic_terms" DROP COLUMN IF EXISTS "declared_billable_count";
ALTER TABLE "academic"."academic_terms" DROP COLUMN IF EXISTS "census_variance_reason";
ALTER TABLE "academic"."academic_terms" DROP COLUMN IF EXISTS "census_locked_by_id";

ALTER TABLE "academic"."academic_terms" DROP CONSTRAINT IF EXISTS "academic_terms_census_date_in_range";
ALTER TABLE "academic"."academic_terms" ADD CONSTRAINT "academic_terms_census_snapshot_date_in_range"
  CHECK (
    "census_snapshot_date" IS NULL
    OR (
      "start_date" IS NOT NULL
      AND "end_date" IS NOT NULL
      AND "census_snapshot_date" >= "start_date"
      AND "census_snapshot_date" <= "end_date"
    )
  );

ALTER TABLE "academic"."academic_terms" DROP CONSTRAINT IF EXISTS "academic_terms_enrollment_before_census";
ALTER TABLE "academic"."academic_terms" ADD CONSTRAINT "academic_terms_enrollment_before_snapshot"
  CHECK (
    "enrollment_window_close_date" IS NULL
    OR "census_snapshot_date" IS NULL
    OR "enrollment_window_close_date" <= "census_snapshot_date"
  );

ALTER TABLE "student"."enrollment_attestations" ADD COLUMN "generated_by" varchar(50) NOT NULL DEFAULT 'system';

UPDATE "student"."enrollment_attestations"
SET "generated_by" = "attested_by_id"::text
WHERE "attested_by_id" IS NOT NULL;

ALTER TABLE "student"."enrollment_attestations" ALTER COLUMN "attested_by_id" DROP NOT NULL;
ALTER TABLE "student"."enrollment_attestations" DROP COLUMN IF EXISTS "declared_billable_count";

CREATE TABLE "ledger"."psf_adjustment_requests" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"."tenants"("id"),
  "term_id" uuid NOT NULL,
  "requested_by_id" uuid NOT NULL,
  "reason" varchar(500) NOT NULL,
  "delta_type" varchar(20) NOT NULL,
  "student_ids" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "reviewed_by_id" uuid,
  "reviewed_at" timestamp with time zone,
  "rejection_reason" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "psf_adjustment_requests_delta_type_valid"
    CHECK ("delta_type" IN ('add_students', 'remove_students')),
  CONSTRAINT "psf_adjustment_requests_status_valid"
    CHECK ("status" IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX "psf_adjustment_requests_tenant_term_idx"
  ON "ledger"."psf_adjustment_requests" ("tenant_id", "term_id");
CREATE INDEX "psf_adjustment_requests_status_idx"
  ON "ledger"."psf_adjustment_requests" ("status");

ALTER TABLE "ledger"."psf_adjustment_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger"."psf_adjustment_requests" FORCE ROW LEVEL SECURITY;

CREATE POLICY "psf_adjustment_requests_tenant_isolation" ON "ledger"."psf_adjustment_requests"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::uuid);
