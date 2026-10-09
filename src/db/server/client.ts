import { DatabaseSync } from 'node:sqlite';
import { dev } from '$app/env';
import { DATABASE_APP_URL } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { auditDb } from './audit/client.ts';
import { createAuditLogger } from './audit/logger.ts';
import { databaseSyncOptions } from './options.ts';
import { relations } from './relations.ts';

const client = new DatabaseSync(DATABASE_APP_URL, databaseSyncOptions);

if (!dev) client.exec('PRAGMA journal_mode = WAL');

const getAuditContext = () => {
	const event = getRequestEvent();
	return {
		sub: event.locals.session?.sub,
		ip: event.getClientAddress(),
		pathname: new URL(event.request.url).pathname,
	};
};

const databaseOptions = { client, relations, jit: true };

export const silentDb = drizzle({ ...databaseOptions, logger: false });

export const db = drizzle({
	...databaseOptions,
	logger: dev ? false : createAuditLogger(auditDb, getAuditContext, { logSelectQueries: false }),
});

const readClient = drizzle({
	...databaseOptions,
	logger: dev ? false : createAuditLogger(auditDb, getAuditContext, { logSelectQueries: true }),
});

export const auditedReadDb: App.ReadDatabase = {
	query: readClient.query,
	select: readClient.select.bind(readClient),
	selectDistinct: readClient.selectDistinct.bind(readClient),
};

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => client.close());
