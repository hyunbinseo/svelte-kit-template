import { DATABASE_APP_URL, DATABASE_AUDIT_URL } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { drizzle } from 'drizzle-orm/node-sqlite';
import type { SQLiteTransactionConfig } from 'drizzle-orm/sqlite-core';
import { type AuditScope, createAuditLogger } from '#database/audit/logger.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { relations } from './relations.ts';
import type { AppDb, AppDbOrTx } from './types.ts';

const appClient = openDatabase(DATABASE_APP_URL);
const auditClient = DATABASE_AUDIT_URL ? openDatabase(DATABASE_AUDIT_URL) : undefined;

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => {
	appClient.close();
	auditClient?.close();
});

const auditDb = auditClient ? drizzle({ ...drizzleOptions, client: auditClient }) : undefined;

const createLogger = (scope: AuditScope) => {
	if (!auditDb) return;

	return createAuditLogger(
		auditDb,
		captureException,
		() => {
			try {
				const event = getRequestEvent();
				return {
					sub: event.locals.session?.sub,
					ip: event.getClientAddress(),
					pathname: new URL(event.request.url).pathname,
				};
			} catch {
				return { sub: null, ip: '', pathname: null };
			}
		},
		{ scope },
	);
};

export const db = drizzle({
	...drizzleOptions,
	client: appClient,
	logger: createLogger('writes'),
	relations,
});

export const fullyAuditedDb = drizzle({
	...drizzleOptions,
	client: appClient,
	logger: createLogger('all'),
	relations,
});

export const createLocalClient = <T>(client: AppDb, queries: (db: AppDbOrTx) => T) => ({
	...queries(client),
	transaction: <R>(
		callback: (tx: T) => ReturnType<Parameters<typeof client.transaction<R>>[0]>,
		config?: SQLiteTransactionConfig,
	) => client.transaction<R>((tx) => callback(queries(tx)), config),
});
