-- Creates the separate audit database used for append-only audit and data-access events.
-- In production this is a separate Aurora cluster (System Design §6.1); locally it is a
-- separate database in the same Postgres instance.
SELECT 'CREATE DATABASE loomis_audit'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'loomis_audit')\gexec

\connect loomis_audit

\i /docker-entrypoint-initdb.d/audit-schema.sql
