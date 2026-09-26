import { DatabaseSync } from 'node:sqlite';
import { DATABASE_AUDIT_URL } from '$app/env/private';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { databaseSyncOptions } from './options.ts';

export const auditDb = DATABASE_AUDIT_URL //
	? drizzle({
			client: new DatabaseSync(DATABASE_AUDIT_URL, databaseSyncOptions),
			jit: true,
		})
	: null;

if (auditDb) {
	auditDb.$client.exec('PRAGMA journal_mode = WAL');
	process.on('sveltekit:shutdown', () => auditDb.$client.close());
}
