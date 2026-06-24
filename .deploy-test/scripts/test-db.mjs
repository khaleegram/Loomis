import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = postgres(url, { connect_timeout: 10, max: 1 });
try {
  const rows = await sql`SELECT 1 AS ok`;
  console.log('DB ok:', rows);
  const wh = await sql`SELECT count(*)::int AS n FROM finance.webhook_events`;
  console.log('webhook_events count:', wh);
} finally {
  await sql.end();
}
