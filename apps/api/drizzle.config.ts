import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './drizzle/schema/identity.ts',
    './drizzle/schema/tenant.ts',
    './drizzle/schema/hrm.ts',
    './drizzle/schema/academic.ts',
    './drizzle/schema/ledger.ts',
  ],
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['identity', 'tenant', 'hrm', 'academic', 'ledger'],
});
