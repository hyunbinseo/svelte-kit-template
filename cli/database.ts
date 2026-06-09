import { relations } from '#lib/database/relations.ts';
import * as schema from '#lib/database/schema.ts';
import { logTable, queryTable } from '#lib/server/database/audit.schema.ts';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { hash } from 'node:crypto';
import { env } from 'node:process';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const auditDb = env.DATABASE_AUDIT_URL //
	? drizzle(env.DATABASE_AUDIT_URL)
	: null;

export const db = drizzle(env.DATABASE_URL, {
	schema,
	relations,
	logger: {
		logQuery: (query, params) => {
			if (query.startsWith('select ') || !auditDb) return;

			const queryHash = hash('sha1', query, 'hex');

			auditDb
				.insert(queryTable)
				.values({ hash: queryHash, sql: query })
				.onConflictDoNothing()
				.run();

			auditDb
				.insert(logTable)
				.values({
					sub: null,
					ip: null,
					pathname: null,
					queryHash,
					params: JSON.stringify(params),
				})
				.run();
		},
	},
});
