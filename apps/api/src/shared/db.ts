import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '../config/env.js';
import * as identitySchema from '../../drizzle/schema/identity.js';

const env = getEnv();

const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, {
  schema: { ...identitySchema },
});

export type Db = typeof db;
export type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Either the root client or an open transaction — accepted by all repositories. */
export type Executor = Db | DbTransaction;
