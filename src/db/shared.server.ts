import { equal } from 'node:assert/strict';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AnyRelations } from 'drizzle-orm';
import type { drizzle, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
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

// Drizzle's client, with transactions restricted, see specs/06-query-layer.md
export type DrizzleDb<TRelations extends AnyRelations> = Omit<
	ReturnType<typeof drizzle<TRelations>>,
	'transaction'
> & {
	// Immediate, so read-then-write paths can't be interleaved by another writer.
	// Sync only: node:sqlite would commit an async callback at its first await.
	transaction: <T>(
		callback: (tx: DrizzleTx<TRelations>) => T extends PromiseLike<unknown> ? never : T,
		config: { behavior: 'immediate' },
	) => T;
};

// No savepoints (nested transactions): code given a tx runs its statements in it.
export type DrizzleTx<TRelations extends AnyRelations> = Omit<
	NodeSQLiteTransaction<TRelations>,
	'transaction'
>;
