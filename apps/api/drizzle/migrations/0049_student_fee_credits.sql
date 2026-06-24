CREATE TABLE IF NOT EXISTS "finance"."student_fee_credits" (
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"balance_minor" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_fee_credits_balance_non_negative" CHECK ("balance_minor" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "student_fee_credits_pk" ON "finance"."student_fee_credits" USING btree ("tenant_id","student_id");--> statement-breakpoint
ALTER TABLE "finance"."student_fee_credits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "finance"."student_fee_credits" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "finance"."student_fee_credits";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "finance"."student_fee_credits"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
