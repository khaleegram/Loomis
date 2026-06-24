-- Custom SQL migration: Read model CHECK constraints and RLS.

DO $$ BEGIN
 ALTER TABLE "read_models"."parent_child_cards"
   ADD CONSTRAINT "parent_child_cards_link_status_valid"
   CHECK ("link_status" IN ('initiated', 'active', 'expired', 'revoked'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "read_models"."parent_child_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "read_models"."parent_child_cards" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "read_models"."parent_child_cards";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "read_models"."parent_child_cards"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint
DROP POLICY IF EXISTS "platform_read" ON "read_models"."parent_child_cards";--> statement-breakpoint
CREATE POLICY "platform_read" ON "read_models"."parent_child_cards"
  AS PERMISSIVE
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');--> statement-breakpoint

ALTER TABLE "read_models"."regional_tenant_analytics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "read_models"."regional_tenant_analytics" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "tenant_isolation" ON "read_models"."regional_tenant_analytics";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "read_models"."regional_tenant_analytics"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));--> statement-breakpoint
DROP POLICY IF EXISTS "platform_read" ON "read_models"."regional_tenant_analytics";--> statement-breakpoint
CREATE POLICY "platform_read" ON "read_models"."regional_tenant_analytics"
  AS PERMISSIVE
  FOR SELECT
  USING (current_setting('app.current_tenant_id', true) = '');
