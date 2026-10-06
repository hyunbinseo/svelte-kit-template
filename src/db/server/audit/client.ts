import { DatabaseSync } from 'node:sqlite';
import { DATABASE_AUDIT_URL } from '$app/env/private';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { databaseSyncOptions } from '#database/options.ts';

export const auditDb = (() => {
	if (!DATABASE_AUDIT_URL) return null;

	const db = drizzle({
		client: new DatabaseSync(DATABASE_AUDIT_URL, databaseSyncOptions),
		jit: true,
	});

	db.$client.exec('PRAGMA journal_mode = WAL');
	process.on('sveltekit:shutdown', () => db.$client.close());

	return db;
})();
