CREATE TABLE IF NOT EXISTS "academic"."bell_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"slots" jsonb NOT NULL,
	"updated_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic"."bell_schedules" ADD CONSTRAINT "bell_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academic"."bell_schedules" ADD CONSTRAINT "bell_schedules_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "academic"."academic_years"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bell_schedules_tenant_year_uidx" ON "academic"."bell_schedules" USING btree ("tenant_id","academic_year_id");
--> statement-breakpoint
ALTER TABLE "academic"."bell_schedules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academic"."bell_schedules" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."bell_schedules";
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."bell_schedules"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
