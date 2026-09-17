import { sql } from 'drizzle-orm';
import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';
import { instant } from '#lib/database/columns.ts';

export const queryTable = snakeCase.table('query', {
	hash: text().primaryKey(),
	sql: text().notNull(),
});

export const logTable = snakeCase.table('log', {
	id: integer().primaryKey({ autoIncrement: true }),
	loggedAt: instant()
		.notNull()
		.default(sql`(unixepoch())`),
	sub: text(),
	ip: text(),
	pathname: text(),
	queryHash: text().notNull(),
	params: text().notNull(),
});
