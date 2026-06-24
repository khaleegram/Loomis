CREATE TABLE IF NOT EXISTS "student"."student_certificates" (
  "id" uuid PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"."tenants"("id"),
  "student_id" uuid NOT NULL REFERENCES "student"."students"("id"),
  "certificate_type" varchar(20) NOT NULL,
  "certificate_number" varchar(64) NOT NULL,
  "academic_year_id" uuid,
  "promotion_record_id" uuid,
  "storage_object_id" uuid NOT NULL,
  "issued_at" timestamp with time zone NOT NULL DEFAULT now(),
  "issued_by_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "student_certificates_tenant_number_unique"
  ON "student"."student_certificates" ("tenant_id", "certificate_number");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "student_certificates_leaving_year_unique"
  ON "student"."student_certificates" ("tenant_id", "student_id", "certificate_type", "academic_year_id")
  WHERE "certificate_type" = 'leaving' AND "academic_year_id" IS NOT NULL;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "student"."student_certificates"
   ADD CONSTRAINT "student_certificates_type_valid"
   CHECK ("certificate_type" IN ('leaving', 'transfer'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "student"."student_certificates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student"."student_certificates" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "student"."student_certificates";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "student"."student_certificates"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
