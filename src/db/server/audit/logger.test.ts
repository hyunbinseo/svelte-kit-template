import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { test } from 'vite-plus/test';
import { relations } from '#database/app/relations.ts';
import { userTable } from '#database/app/schema.ts';
import { drizzleOptions, openDatabase } from '#database/connection.ts';
import { SELECT_REGEX } from './logger.ts';

const db = drizzle({
	...drizzleOptions,
	client: openDatabase(':memory:'),
	relations,
});

test('select queries match the select pattern', () => {
	const queries = [
		db.select().from(userTable),
		db.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, '')),
		db.query.userTable.findFirst({ with: { activeRoles: true } }),
		db.query.userTable.findMany({ columns: { id: true } }),
	];

	for (const query of queries) assert(SELECT_REGEX.test(query.toSQL().sql));
});

test('write queries do not match the select pattern', () => {
	const queries = [
		db.insert(userTable).values({ contact: '' }).returning(),
		db.update(userTable).set({ contact: '' }).where(eq(userTable.id, '')).returning(),
		db.delete(userTable).where(eq(userTable.id, '')).returning(),
	];

	for (const query of queries) assert(!SELECT_REGEX.test(query.toSQL().sql));
});

test('raw select queries match regardless of case and whitespace', () => {
	for (const query of ['SELECT 1', 'Select 1', '\n  select\n1']) assert(SELECT_REGEX.test(query));

	for (const query of [
		'selected',
		'INSERT INTO t SELECT 1',
		'PRAGMA select',
		'WITH x AS (SELECT 1) SELECT * FROM x',
		'WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x',
	]) {
		assert(!SELECT_REGEX.test(query));
	}
});
