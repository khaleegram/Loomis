/**
 * Audit production migrations against local Drizzle journal.
 * Uses count + table spot-checks; Drizzle migrate is authoritative for pending work.
 *
 * Usage: pnpm db:verify:railway
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import postgres from 'postgres';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const journal = JSON.parse(
  readFileSync(join(apiRoot, 'drizzle/migrations/meta/_journal.json'), 'utf8'),
);
const localCount = journal.entries.length;

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  try {
    const varsJson = execSync('railway variables --service loomis-db --json', {
      cwd: apiRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    databaseUrl = JSON.parse(varsJson).DATABASE_PUBLIC_URL;
  } catch {
    console.error('Set DATABASE_URL or run with Railway linked (loomis-db).');
    process.exit(1);
  }
}

const sql = postgres(databaseUrl, { max: 1 });

const [{ n: appliedCount }] = await sql`
  SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations
`;

const lastApplied = await sql`
  SELECT id, hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY id DESC
  LIMIT 5
`;

const latestTag = journal.entries[journal.entries.length - 1]?.tag ?? '?';

const tables = await sql`
  SELECT n.nspname AS schema, c.relname AS table
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE (n.nspname, c.relname) IN (
    ('academic', 'calendar_events'),
    ('website', 'page_views'),
    ('website', 'inquiries'),
    ('website', 'sites'),
    ('tenant', 'tenants'),
    ('identity', 'users')
  )
  ORDER BY 1, 2
`;

console.log('=== Loomis production migration audit ===\n');
console.log(`Local journal:     ${localCount} migrations (latest: ${latestTag})`);
console.log(`Production applied: ${appliedCount} migrations`);
console.log('');

const countOk = localCount === appliedCount;
console.log(countOk ? '✅ Count matches — all journal entries recorded on prod.' : `❌ Count mismatch — ${localCount - appliedCount} migration(s) may be pending.`);

console.log('\n=== Recent tables (spot-check) ===');
for (const row of tables) console.log(`  ✅ ${row.schema}.${row.table}`);

console.log('\n=== Last 5 applied (newest first) ===');
for (const row of lastApplied.reverse()) {
  console.log(`  #${row.id}  ${row.hash.slice(0, 24)}…`);
}

console.log('\n=== Drizzle migrate (authoritative) ===');
const migrate = spawnSync('node', ['./node_modules/drizzle-kit/bin.cjs', 'migrate'], {
  cwd: apiRoot,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  encoding: 'utf8',
});
const migrateOk = migrate.status === 0 && !/error/i.test(migrate.stderr ?? '');
console.log(migrateOk ? '✅ drizzle-kit migrate — nothing pending.' : '❌ drizzle-kit migrate failed — run pnpm db:migrate:railway');
if (!migrateOk && migrate.stderr) console.log(migrate.stderr.slice(0, 500));

await sql.end();
process.exit(countOk && migrateOk ? 0 : 1);
