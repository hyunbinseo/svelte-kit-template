import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import type { TokenBanReason } from '#auth/enums.ts';
import { relations } from '#database/app/relations.ts';
import { tokenBanTable, tokenTable, userRoleTable, userTable } from '#database/app/schema.ts';
import type { AppDb } from '#database/app/types.ts';
import { DB_APP_MIGRATIONS_DIR } from '#database/config.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { root } from '#tests/utilities.ts';

export const createAppDb = (filename = ':memory:') => {
	const migrationsFolder = resolve(root, DB_APP_MIGRATIONS_DIR);
	assert(readMigrationFiles({ migrationsFolder }).length > 0);

	const db = drizzle({ ...drizzleOptions, client: openDatabase(filename), relations });
	migrate(db, { migrationsFolder });
	return db;
};

export const seedUser = (db: AppDb) =>
	db.insert(userTable).values({ contact: randomUUID() }).returning().all()[0]!;

export const seedToken = (db: AppDb, userId: string, expiresAt: number) =>
	db
		.insert(tokenTable)
		.values({ userId, expiresAt: new Date(expiresAt), ip: '' })
		.returning()
		.all()[0]!;

export const seedUserRole = (db: AppDb, userId: string, assignedBy: string) =>
	db.insert(userRoleTable).values({ userId, role: 'admin', assignedBy }).returning().all()[0]!;

export const seedTokenBan = (
	db: AppDb,
	tokenId: string,
	bannedBy: string,
	reason: TokenBanReason,
	effectiveAt: number,
) =>
	db
		.insert(tokenBanTable)
		.values({ tokenId, reason, effectiveAt: new Date(effectiveAt), bannedBy, ip: '' })
		.returning()
		.all()[0]!;

export const findTokenBans = (db: AppDb, tokenId: string) =>
	db
		.select()
		.from(tokenBanTable)
		.where(eq(tokenBanTable.tokenId, tokenId))
		.orderBy(tokenBanTable.effectiveAt, tokenBanTable.id)
		.all();

export const getSoleTokenBan = (db: AppDb, tokenId: string) => {
	const bans = findTokenBans(db, tokenId);
	assert.equal(bans.length, 1);
	return bans[0]!;
};
