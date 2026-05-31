import { relations } from '#lib/database/relations.ts';
import * as schema from '#lib/database/schema.ts';
import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { DATABASE_AUDIT_URL, DATABASE_URL } from '$env/static/private';
import { DefaultLogger } from 'drizzle-orm/logger';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { logTable } from './audit.schema.ts';

const auditDb = dev
	? null // NOTE `node:sqlite` has no `fileMustExist` option
	: drizzle(DATABASE_AUDIT_URL, { jit: true });

export const db = drizzle(DATABASE_URL, {
	schema,
	relations,
	jit: true,
	logger: dev
		? false
		: new DefaultLogger({
				writer: {
					write: (message) => {
						if (!auditDb) return;
						const event = getRequestEvent();
						auditDb
							.insert(logTable)
							.values({
								sub: event.locals.session?.sub,
								ip: event.getClientAddress(),
								message,
							})
							.run();
					},
				},
			}),
});

if (!dev) {
	auditDb?.$client.exec('PRAGMA journal_mode = WAL');
	db.$client.exec('PRAGMA journal_mode = WAL');
}

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => {
	auditDb?.$client.close();
	db.$client.close();
});
