import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema/identity.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['identity'],
});
