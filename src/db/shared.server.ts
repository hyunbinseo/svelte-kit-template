import { equal } from 'node:assert/strict';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Mode } from '#lib/env.ts';

export type DatabaseName = 'app' | 'audit';

export const isAuditEnabled = (mode: Mode) => mode !== 'development';

const OWNER_ONLY = 0o700;

export const prepareDatabaseFile = (dataDir: string, mode: Mode, name: DatabaseName) => {
	const databasePath = join(dataDir, mode, `${name}.db`);
	const databaseDir = dirname(databasePath);

	mkdirSync(databaseDir, { mode: OWNER_ONLY, recursive: true });

	if (process.platform !== 'win32') {
		const permissions = statSync(databaseDir).mode & 0o777;
		equal(permissions.toString(8), OWNER_ONLY.toString(8));
	}

	return databasePath;
};

export const openDatabase = (path: string) => {
	const database = new DatabaseSync(path, {
		// See https://sqlite.org/c3ref/busy_timeout.html
		timeout: 5000,
	});
	// See https://github.com/nodejs/node/issues/62722
	database.exec('PRAGMA journal_mode = WAL');
	return database;
};
