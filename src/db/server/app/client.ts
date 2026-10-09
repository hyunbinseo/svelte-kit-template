import { DATABASE_APP_URL, DATABASE_AUDIT_URL } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { createAuditLogger } from '#database/audit/logger.ts';
import { DB_AUDIT_LOG_SELECT_QUERIES } from '#database/config.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { relations } from './relations.ts';

const appClient = openDatabase(DATABASE_APP_URL);
const auditClient = DATABASE_AUDIT_URL ? openDatabase(DATABASE_AUDIT_URL) : undefined;

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => {
	appClient.close();
	auditClient?.close();
});

const logger = auditClient
	? createAuditLogger(
			drizzle({ ...drizzleOptions, client: auditClient }),
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
					return { sub: null, ip: null, pathname: null };
				}
			},
			{ logSelectQueries: DB_AUDIT_LOG_SELECT_QUERIES },
		)
	: undefined;

export const db = drizzle({
	...drizzleOptions,
	client: appClient,
	logger,
	relations,
});

export const unauditedDb = drizzle({
	...drizzleOptions,
	client: appClient,
	logger: false,
	relations,
});
