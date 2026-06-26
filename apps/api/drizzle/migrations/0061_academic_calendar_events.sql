CREATE TABLE IF NOT EXISTS "academic"."calendar_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"term_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" varchar(1000),
	"event_type" varchar(30) DEFAULT 'other' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_type_valid" CHECK ("academic"."calendar_events"."event_type" IN ('holiday', 'exam', 'meeting', 'activity', 'resumption', 'other')),
	CONSTRAINT "calendar_events_dates_valid" CHECK ("academic"."calendar_events"."end_date" IS NULL OR "academic"."calendar_events"."end_date" >= "academic"."calendar_events"."start_date")
);
--> statement-breakpoint
ALTER TABLE "academic"."calendar_events" ADD CONSTRAINT "calendar_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academic"."calendar_events" ADD CONSTRAINT "calendar_events_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "academic"."academic_years"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "academic"."calendar_events" ADD CONSTRAINT "calendar_events_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic"."academic_terms"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_tenant_year_date_idx" ON "academic"."calendar_events" USING btree ("tenant_id","academic_year_id","start_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_tenant_term_idx" ON "academic"."calendar_events" USING btree ("tenant_id","term_id");
--> statement-breakpoint
ALTER TABLE "academic"."calendar_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "academic"."calendar_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "academic"."calendar_events";
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "academic"."calendar_events"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
