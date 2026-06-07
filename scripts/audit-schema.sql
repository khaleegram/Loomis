-- Audit cluster schema (System Design §3.3 / §6.1; SRS CON-007).
-- Run against the `loomis_audit` database after creation.
-- Application role `loomis_audit_writer` has INSERT-only on audit tables.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.audit_events (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  actor_user_id uuid,
  actor_type varchar(20) NOT NULL DEFAULT 'user',
  action varchar(120) NOT NULL,
  resource_type varchar(60) NOT NULL,
  resource_id uuid,
  sensitivity varchar(20) NOT NULL,
  result varchar(15) NOT NULL,
  ip_address inet,
  user_agent text,
  request_id uuid NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash varchar(64),
  entry_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_tenant_created_idx
  ON audit.audit_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_action_idx
  ON audit.audit_events (action, created_at DESC);

CREATE TABLE IF NOT EXISTS audit.data_access_events (
  id uuid PRIMARY KEY,
  tenant_id uuid,
  actor_user_id uuid NOT NULL,
  access_reason varchar(40) NOT NULL DEFAULT 'normal_use',
  resource_type varchar(60) NOT NULL,
  resource_count integer NOT NULL DEFAULT 1,
  contains_child_pii boolean NOT NULL DEFAULT false,
  contains_financial_data boolean NOT NULL DEFAULT false,
  support_ticket_id varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_access_events_tenant_created_idx
  ON audit.data_access_events (tenant_id, created_at DESC);

DO $$ BEGIN
  CREATE ROLE loomis_audit_writer LOGIN PASSWORD 'loomis';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT USAGE ON SCHEMA audit TO loomis_audit_writer;
GRANT INSERT ON audit.audit_events TO loomis_audit_writer;
GRANT INSERT ON audit.data_access_events TO loomis_audit_writer;

REVOKE UPDATE, DELETE, TRUNCATE ON audit.audit_events FROM loomis_audit_writer;
REVOKE UPDATE, DELETE, TRUNCATE ON audit.data_access_events FROM loomis_audit_writer;

-- Main app role (loomis) must not mutate audit rows — INSERT via audit writer only.
REVOKE UPDATE, DELETE, TRUNCATE ON audit.audit_events FROM loomis;
REVOKE UPDATE, DELETE, TRUNCATE ON audit.data_access_events FROM loomis;
