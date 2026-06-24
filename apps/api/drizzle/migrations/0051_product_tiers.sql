-- Product pricing tiers (Core / Advanced / Enterprise). Idempotent for prod bootstrap.
INSERT INTO "tenant"."tiers" ("id", "code", "name", "description", "default_psf_rate_minor", "max_students", "created_at", "updated_at")
SELECT gen_random_uuid(), 'core', 'Core', 'Essential school operations — admissions, finance, attendance, gradebook, and parent portal.', 100000, 500, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "tenant"."tiers" WHERE "code" = 'core');

INSERT INTO "tenant"."tiers" ("id", "code", "name", "description", "default_psf_rate_minor", "max_students", "created_at", "updated_at")
SELECT gen_random_uuid(), 'advanced', 'Advanced', 'Core plus workflows inbox, deputy exam officer, and expanded finance controls.', 100000, 2000, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "tenant"."tiers" WHERE "code" = 'advanced');

INSERT INTO "tenant"."tiers" ("id", "code", "name", "description", "default_psf_rate_minor", "max_students", "created_at", "updated_at")
SELECT gen_random_uuid(), 'enterprise', 'Enterprise', 'Full platform capabilities, higher enrollment caps, and enterprise MFA policies.', 100000, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "tenant"."tiers" WHERE "code" = 'enterprise');
