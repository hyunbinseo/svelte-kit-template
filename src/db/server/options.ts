import type { DatabaseSyncOptions } from 'node:sqlite';

export const databaseSyncOptions = {
	// Wait on locks instead of throwing (0 by default).
	// e.g. PM2 cluster processes, parallel E2E workers
	timeout: 5000,
} satisfies DatabaseSyncOptions;
