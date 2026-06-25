-- Schools are live immediately on provision; activate any tenants still stuck in provisioning.
UPDATE "tenant"."tenants"
SET
  "status" = 'active',
  "activated_at" = COALESCE("activated_at", NOW()),
  "go_live_at" = COALESCE("go_live_at", NOW()),
  "updated_at" = NOW()
WHERE "status" = 'provisioning';
