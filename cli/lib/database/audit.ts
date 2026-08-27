import { env } from 'node:process';
import { drizzle } from 'drizzle-orm/node-sqlite';

export const auditDb = env.DATABASE_AUDIT_URL //
	? drizzle(env.DATABASE_AUDIT_URL)
	: null;
