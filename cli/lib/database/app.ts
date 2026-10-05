import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { env } from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { logTable, queryTable } from '#database/audit.schema.ts';
import { databaseSyncOptions } from '#database/options.ts';
import { relations } from '#database/relations.ts';
import { auditDb } from './audit.ts';

assert(env.DATABASE_URL);

export const appDb = drizzle({
	client: new DatabaseSync(env.DATABASE_URL, databaseSyncOptions),
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
