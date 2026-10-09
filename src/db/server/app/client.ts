import { DatabaseSync } from 'node:sqlite';
import { dev } from '$app/env';
import { DATABASE_APP_URL } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { auditDb } from '#database/audit/client.ts';
import { createAuditLogger } from '#database/audit/logger.ts';
import { DB_AUDIT_LOG_SELECT_QUERIES } from '#database/config.ts';
import { databaseSyncOptions } from '#database/options.ts';
import { relations } from './relations.ts';

const client = new DatabaseSync(DATABASE_APP_URL, databaseSyncOptions);

if (!dev) client.exec('PRAGMA journal_mode = WAL');

export const silentDb = drizzle({
	client,
	relations,
	jit: true,
	logger: false,
});

export const db = drizzle({
	client,
	relations,
	jit: true,
	logger: dev
		? false
		: createAuditLogger(
				auditDb,
				() => {
					const event = getRequestEvent();
					return {
						sub: event.locals.session?.sub,
						ip: event.getClientAddress(),
						pathname: new URL(event.request.url).pathname,
					};
				},
				{ logSelectQueries: DB_AUDIT_LOG_SELECT_QUERIES },
			),
});

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => client.close());
