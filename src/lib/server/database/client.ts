import { LOG_SELECT_QUERIES } from '#lib/config.ts';
import { relations } from '#lib/database/relations.ts';
import * as schema from '#lib/database/schema.ts';
import { dev } from '$app/env';
import { DATABASE_URL } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { hash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { auditDb } from './audit.client.ts';
import { logTable, queryTable } from './audit.schema.ts';

const client = new DatabaseSync(DATABASE_URL);

if (!dev) client.exec('PRAGMA journal_mode = WAL');

export const silentDb = drizzle({
	client,
	schema,
	relations,
	jit: true,
	logger: false,
});

export const db = drizzle({
	client,
	schema,
	relations,
	jit: true,
	logger: dev
		? false
		: {
				logQuery: (query, params) => {
					if (!auditDb) return;
					if (!LOG_SELECT_QUERIES && query.startsWith('select ')) return;

					const queryHash = hash('sha1', query, 'hex');
					const event = getRequestEvent();

					auditDb
						.insert(queryTable)
						.values({ hash: queryHash, sql: query })
						.onConflictDoNothing()
						.run();

					auditDb
						.insert(logTable)
						.values({
							sub: event.locals.session?.sub,
							ip: event.getClientAddress(),
							pathname: event.url.pathname,
							queryHash,
							params: JSON.stringify(params),
						})
						.run();
				},
			},
});

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => client.close());
