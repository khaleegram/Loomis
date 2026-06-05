import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '../config/env.js';
import * as identitySchema from '../../drizzle/schema/identity.js';
import * as tenantSchema from '../../drizzle/schema/tenant.js';
import * as hrmSchema from '../../drizzle/schema/hrm.js';
import * as academicSchema from '../../drizzle/schema/academic.js';
import * as ledgerSchema from '../../drizzle/schema/ledger.js';
import * as studentSchema from '../../drizzle/schema/student.js';

const env = getEnv();

const client = postgres(env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, {
  schema: {
    ...identitySchema,
    ...tenantSchema,
    ...hrmSchema,
    ...academicSchema,
    ...ledgerSchema,
    ...studentSchema,
  },
});

export type Db = typeof db;
export type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Either the root client or an open transaction — accepted by all repositories. */
export type Executor = Db | DbTransaction;
