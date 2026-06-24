-- Go-live scheduling + tenant contacts
ALTER TABLE "tenant"."tenants" ADD COLUMN IF NOT EXISTS "go_live_at" timestamptz;
ALTER TABLE "tenant"."tenants" ADD COLUMN IF NOT EXISTS "activated_at" timestamptz;

UPDATE "tenant"."tenants"
SET "go_live_at" = COALESCE("go_live_at", "created_at")
WHERE "go_live_at" IS NULL;

UPDATE "tenant"."tenants"
SET "activated_at" = COALESCE("activated_at", "created_at")
WHERE "status" = 'active' AND "activated_at" IS NULL;

ALTER TABLE "tenant"."tenants" ALTER COLUMN "go_live_at" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "tenant"."tenant_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"."tenants"("id") ON DELETE CASCADE,
  "role" varchar(20) NOT NULL,
  "full_name" varchar(200),
  "email" varchar(255) NOT NULL,
  "phone" varchar(20),
  "is_primary" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_contacts_role_valid" CHECK ("role" IN ('primary', 'billing', 'operations', 'proprietor'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_contacts_one_primary_per_tenant"
  ON "tenant"."tenant_contacts" ("tenant_id")
  WHERE "is_primary" = true;

CREATE INDEX IF NOT EXISTS "tenant_contacts_tenant_id_idx" ON "tenant"."tenant_contacts" ("tenant_id");

-- Backfill primary contacts from legacy columns
INSERT INTO "tenant"."tenant_contacts" ("id", "tenant_id", "role", "full_name", "email", "phone", "is_primary", "created_at", "updated_at")
SELECT gen_random_uuid(), t."id", 'primary', NULL, t."contact_email", t."contact_phone", true, t."created_at", t."updated_at"
FROM "tenant"."tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "tenant"."tenant_contacts" c WHERE c."tenant_id" = t."id" AND c."is_primary" = true
);
