/**
 * One-shot production seed — platform accounts + all demo schools.
 *
 * Usage (Railway public DB URL in env):
 *   pnpm --filter @loomis/api db:seed:prod
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const apiRoot = dirname(fileURLToPath(import.meta.url));
const tsx = join(apiRoot, '../node_modules/tsx/dist/cli.mjs');
const envFile = join(apiRoot, '../../../.env.railway.local');

const steps = [
  { name: 'Platform + QA schools (seed-dev)', script: 'seed-dev.ts' },
  { name: 'Advanced demo students', script: 'seed-advanced-demo-data.ts' },
  { name: 'Greenfield rich school', script: 'seed-rich-school.ts' },
];

function runStep(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--env-file', envFile, tsx, join(apiRoot, script)],
      {
        cwd: join(apiRoot, '..'),
        env: process.env,
        stdio: 'inherit',
      },
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Loomis production seed — all demo schools');
  console.log('  Greenfield takes ~15–25 min (467 students). Do not interrupt.');
  console.log('══════════════════════════════════════════════════════════════\n');

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    console.log(`\n[${i + 1}/${steps.length}] ${step.name}…\n`);
    await runStep(step.script);
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Production seed complete.');
  console.log('  Logins: docs/loomis-roles-and-logins.md');
  console.log('  Password: LoomisDev2026!');
  console.log('══════════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Production seed failed:', err);
  process.exit(1);
});
