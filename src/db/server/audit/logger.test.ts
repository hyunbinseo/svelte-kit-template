import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { test } from 'vite-plus/test';
import { relations } from '#database/app/relations.ts';
import { userTable } from '#database/app/schema.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { SELECT_PREFIX } from './logger.ts';

const db = drizzle({
	...drizzleOptions,
	client: openDatabase(':memory:'),
	relations,
});

test('select queries start with lowercase select', () => {
	const queries = [
		db.select().from(userTable),
		db.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, '')),
		db.query.userTable.findFirst({ with: { activeRoles: true } }),
		db.query.userTable.findMany({ columns: { id: true } }),
	];

	for (const query of queries) assert(query.toSQL().sql.startsWith(SELECT_PREFIX));
});

test('write queries do not start with select', () => {
	const queries = [
		db.insert(userTable).values({ contact: '' }).returning(),
		db.update(userTable).set({ contact: '' }).where(eq(userTable.id, '')).returning(),
		db.delete(userTable).where(eq(userTable.id, '')).returning(),
	];

	for (const query of queries) assert(!query.toSQL().sql.startsWith(SELECT_PREFIX));
});
