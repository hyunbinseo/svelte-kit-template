import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { eq } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { DB_APP_MIGRATIONS_DIR } from '#database/config.ts';
import { databaseSyncOptions } from '#database/options.ts';
import { relations } from '#database/relations.ts';
import { tokenBanTable, tokenTable, userRoleTable, userTable } from '#database/schema.ts';
import { root } from '#tests/utilities.ts';

export const createAppDb = (filename = ':memory:') => {
	const migrationsFolder = resolve(root, DB_APP_MIGRATIONS_DIR);
	assert(readMigrationFiles({ migrationsFolder }).length > 0);

	const db = drizzle({ client: new DatabaseSync(filename, databaseSyncOptions), relations });
	migrate(db, { migrationsFolder });
	return db;
};

export const seedUser = (db: ReturnType<typeof createAppDb>) =>
	db.insert(userTable).values({ contact: randomUUID() }).returning().all()[0]!.id;

export const seedToken = (db: ReturnType<typeof createAppDb>, userId: string, expiresAt: number) =>
	db
		.insert(tokenTable)
		.values({ userId, expiresAt: new Date(expiresAt), ip: '' })
		.returning()
		.all()[0]!.id;

export const seedRole = (db: ReturnType<typeof createAppDb>, userId: string, assignedBy: string) =>
	db.insert(userRoleTable).values({ userId, role: 'admin', assignedBy }).returning().all()[0]!;

export const banFor = (db: ReturnType<typeof createAppDb>, tokenId: string) =>
	db.select().from(tokenBanTable).where(eq(tokenBanTable.tokenId, tokenId)).get();
