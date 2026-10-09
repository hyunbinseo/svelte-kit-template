import { DatabaseSync, type DatabaseSyncOptions } from 'node:sqlite';
import type { DrizzleConfig } from 'drizzle-orm';

export const drizzleOptions = {
	jit: true,
} satisfies DrizzleConfig;

export const databaseOptions = {
	// Wait on locks instead of throwing (0 by default).
	// e.g. PM2 cluster processes, parallel E2E workers
	timeout: 5000,
} satisfies DatabaseSyncOptions;

export const openDatabase = (path: string) => {
	const client = new DatabaseSync(path, databaseOptions);
	client.exec('PRAGMA journal_mode = WAL');
	return client;
};
