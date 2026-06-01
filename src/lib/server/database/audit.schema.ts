import { sql } from 'drizzle-orm';
import { integer, snakeCase, text } from 'drizzle-orm/sqlite-core';

export const queryTable = snakeCase.table('query', {
	hash: text().primaryKey(),
	sql: text().notNull(),
});

export const logTable = snakeCase.table('log', {
	id: integer().primaryKey({ autoIncrement: true }),
	loggedAt: integer({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	sub: text(),
	ip: text(),
	pathname: text(),
	queryHash: text().notNull(),
	params: text().notNull(),
});
