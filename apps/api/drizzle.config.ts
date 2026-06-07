import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './drizzle/schema/identity.ts',
    './drizzle/schema/tenant.ts',
    './drizzle/schema/hrm.ts',
    './drizzle/schema/academic.ts',
    './drizzle/schema/ledger.ts',
    './drizzle/schema/finance.ts',
    './drizzle/schema/student.ts',
    './drizzle/schema/workflow.ts',
    './drizzle/schema/storage.ts',
    './drizzle/schema/risk.ts',
    './drizzle/schema/referral.ts',
  ],
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['identity', 'tenant', 'hrm', 'academic', 'ledger', 'finance', 'student', 'workflow', 'storage', 'risk', 'referral'],
});
