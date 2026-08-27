import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { root } from '#cli/lib/utilities.ts';
import { relations } from '#lib/database/relations.ts';
import { tokenBanTable, tokenTable, userRoleTable, userTable } from '#lib/database/schema.ts';

export const createDb = () => {
	const db = drizzle({ client: new DatabaseSync(':memory:'), relations });
	migrate(db, { migrationsFolder: resolve(root, 'drizzle/app') });
	return db;
};

export const seedUser = (db: ReturnType<typeof createDb>) =>
	db.insert(userTable).values({ contact: randomUUID() }).returning().all()[0]!.id;

export const seedToken = (db: ReturnType<typeof createDb>, userId: string, expiresAt: number) =>
	db
		.insert(tokenTable)
		.values({ userId, expiresAt: new Date(expiresAt), ip: '' })
		.returning()
		.all()[0]!.id;

export const seedRole = (db: ReturnType<typeof createDb>, userId: string, assignedBy: string) =>
	db.insert(userRoleTable).values({ userId, role: 'admin', assignedBy }).returning().all()[0]!;

export const banFor = (db: ReturnType<typeof createDb>, tokenId: string) =>
	db.select().from(tokenBanTable).where(eq(tokenBanTable.tokenId, tokenId)).get();
