import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DB_AUDIT_MIGRATIONS_DIR } from '#database/config.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { root } from '#tests/utilities.ts';

export const createAuditDb = (filename = ':memory:') => {
	const migrationsFolder = resolve(root, DB_AUDIT_MIGRATIONS_DIR);
	assert(readMigrationFiles({ migrationsFolder }).length > 0);

	const db = drizzle({ ...drizzleOptions, client: openDatabase(filename) });
	migrate(db, { migrationsFolder });
	return db;
};
