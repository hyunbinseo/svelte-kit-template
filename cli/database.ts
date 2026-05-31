import { relations } from '#lib/database/relations.ts';
import * as schema from '#lib/database/schema.ts';
import { logTable } from '#lib/server/database/audit.schema.ts';
import { DefaultLogger } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { root } from './utilities.ts';

loadEnvFile(resolve(root, '.env'));

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!env.DATABASE_AUDIT_URL) throw new Error('DATABASE_AUDIT_URL is not set');

export const auditDb = drizzle(env.DATABASE_AUDIT_URL);

export const db = drizzle(env.DATABASE_URL, {
	schema,
	relations,
	logger: new DefaultLogger({
		writer: {
			write: (message) => {
				auditDb.insert(logTable).values({ sub: null, ip: '127.0.0.1', message }).run();
			},
		},
	}),
});
