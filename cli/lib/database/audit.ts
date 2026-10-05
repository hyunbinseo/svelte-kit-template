import { env } from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { databaseSyncOptions } from '#database/options.ts';

export const auditDb = env.DATABASE_AUDIT_URL //
	? drizzle({ client: new DatabaseSync(env.DATABASE_AUDIT_URL, databaseSyncOptions) })
	: null;
