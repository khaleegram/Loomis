-- Idempotent migration: legacy before_hash/after_hash → previous_hash/entry_hash (CON-007).
-- Run against loomis_audit when audit writes fail with "column entry_hash does not exist".

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'audit' AND table_name = 'audit_events' AND column_name = 'before_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'audit' AND table_name = 'audit_events' AND column_name = 'previous_hash'
  ) THEN
    ALTER TABLE audit.audit_events RENAME COLUMN before_hash TO previous_hash;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'audit' AND table_name = 'audit_events' AND column_name = 'after_hash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'audit' AND table_name = 'audit_events' AND column_name = 'entry_hash'
  ) THEN
    ALTER TABLE audit.audit_events RENAME COLUMN after_hash TO entry_hash;
  END IF;
END $$;

-- Legacy rows may have NULL hashes; remove before NOT NULL constraint.
DELETE FROM audit.audit_events WHERE entry_hash IS NULL;

ALTER TABLE audit.audit_events ALTER COLUMN entry_hash SET NOT NULL;
