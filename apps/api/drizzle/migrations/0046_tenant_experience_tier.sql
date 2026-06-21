-- Sprint 1: tenant experience tier spine (ROLE_EXPERIENCE_TIER_PLAN.md)
ALTER TABLE "tenant"."tenants" ADD COLUMN IF NOT EXISTS "experience_tier" varchar(20) DEFAULT 'core' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant"."tenants" ADD COLUMN IF NOT EXISTS "finance_mode" varchar(20) DEFAULT 'combined' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant"."tenants" ADD COLUMN IF NOT EXISTS "experience_flags" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant"."tenants" DROP CONSTRAINT IF EXISTS "tenants_experience_tier_valid";--> statement-breakpoint
ALTER TABLE "tenant"."tenants" ADD CONSTRAINT "tenants_experience_tier_valid" CHECK ("experience_tier" IN ('core', 'advanced', 'enterprise'));--> statement-breakpoint
ALTER TABLE "tenant"."tenants" DROP CONSTRAINT IF EXISTS "tenants_finance_mode_valid";--> statement-breakpoint
ALTER TABLE "tenant"."tenants" ADD CONSTRAINT "tenants_finance_mode_valid" CHECK ("finance_mode" IN ('combined', 'split'));
