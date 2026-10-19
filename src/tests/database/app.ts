import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { createSessionSecret, hashSessionSecret, toSessionToken } from '#auth/server/token.ts';
import { relations } from '#database/app/relations.ts';
import { userRoleTable, userSessionTable, userTable } from '#database/app/schema.ts';
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

export const seedUserRole = (db: AppDb, userId: string, assignedBy: string) =>
	db.insert(userRoleTable).values({ userId, role: 'admin', assignedBy }).returning().all()[0]!;

export const seedUserSession = (db: AppDb, userId: string, expiresAt: number) => {
	const secret = createSessionSecret();
	const session = db
		.insert(userSessionTable)
		.values({
			userId,
			secretHash: hashSessionSecret(secret),
			expiresAt: new Date(expiresAt),
			ip: '',
		})
		.returning()
		.all()[0]!;
	return { ...session, token: toSessionToken(session.id, secret) };
};
