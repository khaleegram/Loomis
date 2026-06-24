CREATE TABLE IF NOT EXISTS "tenant"."provision_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_by_id" uuid NOT NULL,
  "source" varchar(20) NOT NULL,
  "payload" jsonb NOT NULL,
  "step_index" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "provision_drafts_source_valid" CHECK ("source" IN ('platform', 'regional'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "provision_drafts_actor_source_unique"
  ON "tenant"."provision_drafts" ("created_by_id", "source");
