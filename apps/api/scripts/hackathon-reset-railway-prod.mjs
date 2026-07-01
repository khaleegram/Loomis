/**
 * Reset JSS3 B hackathon demo fees on Railway prod (uses public Postgres URL).
 *
 * Usage (from apps/api): pnpm db:hackathon:reset-jss3b:railway
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

const dbVars = JSON.parse(varsJson);
const databaseUrl = dbVars.DATABASE_PUBLIC_URL;
if (!databaseUrl) {
  console.error('DATABASE_PUBLIC_URL missing on loomis-db — enable public networking in Railway.');
  process.exit(1);
}

let apiVars = {};
try {
  apiVars = JSON.parse(
    execSync('railway variables --service loomis-api --json', {
      cwd: apiRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }),
  );
} catch {
  console.warn('Could not read loomis-api variables — using DATABASE_URL only for reset script.');
}

console.log('Resetting JSS3 B hackathon demo fees on Railway production…');

const result = spawnSync(
  process.execPath,
  ['./node_modules/tsx/dist/cli.mjs', 'scripts/hackathon-reset-jss3b-fees.ts'],
  {
    cwd: apiRoot,
    env: {
      ...process.env,
      ...apiVars,
      DATABASE_URL: databaseUrl,
      DATABASE_AUDIT_URL: apiVars.DATABASE_AUDIT_URL ?? databaseUrl,
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
