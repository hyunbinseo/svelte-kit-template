import { env } from 'node:process';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { drizzleOptions, openDatabase } from '#database/connection.ts';

export const auditDb = env.DATABASE_AUDIT_URL
	? drizzle({ ...drizzleOptions, client: openDatabase(env.DATABASE_AUDIT_URL) })
	: undefined;
