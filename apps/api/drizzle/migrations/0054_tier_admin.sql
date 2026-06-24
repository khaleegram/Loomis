ALTER TABLE "tenant"."tiers" ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false;

UPDATE "tenant"."tiers"
SET "is_system" = true
WHERE "code" IN ('core', 'advanced', 'enterprise');
