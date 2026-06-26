/**
 * Run Drizzle migrations against Railway production Postgres from your PC.
 * Uses DATABASE_PUBLIC_URL from the loomis-db service (internal hostnames
 * do not resolve outside Railway).
 *
 * Prerequisites: railway login, railway link → loomis-api
 * Usage (from apps/api): pnpm db:migrate:railway
 */
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

let varsJson;
try {
  varsJson = execSync('railway variables --service loomis-db --json', {
    cwd: apiRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch {
  console.error(
    'Could not read Railway variables. Run: railway login && cd apps/api && railway link',
  );
  process.exit(1);
}

const vars = JSON.parse(varsJson);
const databaseUrl = vars.DATABASE_PUBLIC_URL;
if (!databaseUrl) {
  console.error('DATABASE_PUBLIC_URL missing on loomis-db — enable public networking in Railway.');
  process.exit(1);
}

console.log('Applying migrations to Railway production (public Postgres URL)…');

const result = spawnSync('node', ['./node_modules/drizzle-kit/bin.cjs', 'migrate'], {
  cwd: apiRoot,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
